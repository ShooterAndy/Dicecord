/**
 * InteractionAdapter — wraps a raw Discord interaction payload (from HTTP POST)
 * and provides an API compatible with discord.js interaction objects.
 *
 * This allows existing command handlers, replyOrFollowUp, genericCommandSaver, etc.
 * to work without modification (or with minimal changes).
 */

const {
  Routes,
  InteractionType,
  InteractionResponseType,
  ComponentType,
  MessageFlags
} = require('discord-api-types/v10')
const logger = require('./logger')
const pendingInteractions = require('./pendingInteractions')
const getRest = require('./rest')

const _appId = () => process.env.APP_ID

/**
 * Parses resolved options from the raw interaction data.
 */
class OptionsAdapter {
  constructor (data, resolved) {
    // data is the array of options from the interaction
    this._options = data || []
    this._resolved = resolved || {}
    // Store raw data for genericCommandSaver (interaction.options.data)
    this.data = data || []
  }

  _find (name) {
    return this._options.find(o => o.name === name) ?? null
  }

  getString (name) {
    const opt = this._find(name)
    return opt ? String(opt.value) : null
  }

  getInteger (name) {
    const opt = this._find(name)
    return opt ? Number(opt.value) : null
  }

  getBoolean (name) {
    const opt = this._find(name)
    return opt != null ? Boolean(opt.value) : null
  }

  getSubcommand () {
    const sub = this._options.find(o => o.type === 1) // SUB_COMMAND
    return sub ? sub.name : null
  }

  /**
   * For autocomplete: get the focused option.
   * @param {boolean} [full=false] — if true, returns { name, value } instead of just value.
   */
  getFocused (full = false) {
    const opt = this._options.find(o => o.focused)
    if (!opt) return full ? { name: '', value: '' } : ''
    return full ? { name: opt.name, value: opt.value ?? '' } : (opt.value ?? '')
  }

  getUser (name) {
    const opt = this._find(name)
    if (!opt) return null
    const userId = opt.value
    return this._resolved?.users?.[userId] ?? { id: userId }
  }

  getMember (name) {
    const opt = this._find(name)
    if (!opt) return null
    const userId = opt.value
    return this._resolved?.members?.[userId] ?? null
  }
}

/**
 * Parses modal submission fields.
 */
class FieldsAdapter {
  constructor (components) {
    // components is an array of action rows, each with components
    this._fields = {}
    if (components) {
      for (const row of components) {
        if (row.components) {
          for (const comp of row.components) {
            this._fields[comp.custom_id] = comp.value ?? ''
          }
        }
      }
    }
  }

  getTextInputValue (customId) {
    return this._fields[customId] ?? ''
  }
}

/**
 * Main adapter class.
 */
class InteractionAdapter {
  /**
   * @param {object} rawPayload — The raw interaction JSON from Discord
   * @param {object} expressRes — The Express response object (for initial responses)
   */
  constructor (rawPayload, expressRes) {
    this._raw = rawPayload
    this._res = expressRes
    this._responded = false
    this._deferred = false
    this._replied = false

    // Core properties
    this.id = rawPayload.id
    this.token = rawPayload.token
    this.type = rawPayload.type
    this.guildId = rawPayload.guild_id ?? rawPayload.guild?.id ?? null
    this.channelId = rawPayload.channel_id ?? rawPayload.channel?.id ?? null
    this.commandName = rawPayload.data?.name ?? null
    this.customId = rawPayload.data?.custom_id ?? null
    this.locale = rawPayload.locale ?? 'en-US'
    this.guildLocale = rawPayload.guild_locale ?? null

    // User
    const rawUser = rawPayload.member?.user ?? rawPayload.user ?? {}
    this.user = {
      id: rawUser.id,
      username: rawUser.username,
      discriminator: rawUser.discriminator ?? '0',
      tag: rawUser.discriminator && rawUser.discriminator !== '0'
        ? `${rawUser.username}#${rawUser.discriminator}`
        : rawUser.username,
      bot: rawUser.bot ?? false,
      avatar: rawUser.avatar,
      // For sendDM compatibility
      createDM: async () => {
        const rest = getRest()
        const dm = await rest.post(Routes.userChannels(), {
          body: { recipient_id: rawUser.id }
        })
        return {
          id: dm.id,
          send: async (content) => {
            const body = typeof content === 'string' ? { content } : content
            return rest.post(Routes.channelMessages(dm.id), { body })
          }
        }
      }
    }

    // Member (for guild interactions)
    this.member = rawPayload.member ?? null

    // Options
    this.options = new OptionsAdapter(
      rawPayload.data?.options,
      rawPayload.data?.resolved
    )

    // Fields (for modal submissions)
    this.fields = new FieldsAdapter(rawPayload.data?.components)

    // Channel stub (for roll.js NSFW check — interaction.channel.nsfw)
    // HTTP interactions include channel data in the payload since API v10
    this.channel = rawPayload.channel ?? null

    // Message (for button interactions — the message the button was on)
    this.message = rawPayload.message ?? null

    // Fake client with .rest for editMessage.js compatibility
    this.client = {
      rest: getRest()
    }
  }

  // --- Type checks ---
  isCommand () {
    return this.type === InteractionType.ApplicationCommand
  }

  isAutocomplete () {
    return this.type === InteractionType.ApplicationCommandAutocomplete
  }

  isButton () {
    return this.type === InteractionType.MessageComponent &&
      this._raw.data?.component_type === ComponentType.Button
  }

  isModalSubmit () {
    return this.type === InteractionType.ModalSubmit
  }

  isRepliable () {
    return this.isCommand() || this.isButton() || this.isModalSubmit()
  }

  get replied () {
    return this._replied
  }

  get deferred () {
    return this._deferred
  }

  // --- Responses ---

  /**
   * Send the initial HTTP response. Can only be called once per request.
   */
  _sendInitialResponse (body) {
    if (this._responded) {
      logger.warn(`[Adapter] Attempted double initial response for interaction ${this.id}`)
      return
    }
    this._responded = true
    if (this._res && !this._res.headersSent) {
      this._res.json(body)
    }
  }

  async deferReply (opts = {}) {
    this._deferred = true
    const flags = opts.ephemeral ? MessageFlags.Ephemeral : 0
    this._sendInitialResponse({
      type: InteractionResponseType.DeferredChannelMessageWithSource,
      data: flags ? { flags } : undefined
    })
  }

  async editReply (content) {
    this._replied = true
    const rest = getRest()
    const body = this._toAPIMessage(content)
    const raw = await rest.patch(
      Routes.webhookMessage(_appId(), this.token, '@original'),
      { body }
    )
    return this._normalizeMessage(raw)
  }

  async followUp (content) {
    const rest = getRest()
    const body = this._toAPIMessage(content)
    const raw = await rest.post(
      Routes.webhook(_appId(), this.token),
      { body }
    )
    return this._normalizeMessage(raw)
  }

  async showModal (modal) {
    const data = typeof modal.toJSON === 'function' ? modal.toJSON() : modal
    this._sendInitialResponse({
      type: InteractionResponseType.Modal,
      data
    })
  }

  /**
   * Acknowledge a component interaction by updating the message.
   * Equivalent to discord.js interaction.update().
   */
  async update (content) {
    const body = typeof content === 'string' ? { content } : this._toAPIMessage(content)
    this._sendInitialResponse({
      type: 7, // InteractionResponseType.UpdateMessage
      data: body
    })
  }

  /**
   * Acknowledge a component interaction without updating the message.
   * Equivalent to discord.js interaction.deferUpdate().
   */
  async deferUpdate () {
    this._sendInitialResponse({
      type: 6 // InteractionResponseType.DeferredMessageUpdate
    })
  }

  /**
   * Respond to autocomplete.
   * @param {Array<{name: string, value: string}>} choices
   */
  async respond (choices) {
    this._sendInitialResponse({
      type: InteractionResponseType.ApplicationCommandAutocompleteResult,
      data: { choices }
    })
  }

  /**
   * Wait for a modal submission matching the given filter.
   * This registers a pending handler and returns a Promise.
   */
  async awaitModalSubmit ({ time, filter }) {
    // We need to wait for a modal submission. The customId is set by the caller.
    // We'll derive it from the filter — the filter tests mi.customId === someId
    // Since we can't introspect the filter, we register by the interaction id
    // and let the server try all pending entries.
    //
    // Better approach: the caller sets a unique customId on the modal, and
    // we can intercept it. Let's register by interaction id and use the filter.

    const waitKey = `modal-await:${this.id}`
    return pendingInteractions.wait(waitKey, { time, filter, type: 'modal' })
  }

  /**
   * Convert content to API message body.
   */
  _toAPIMessage (content) {
    if (typeof content === 'string') {
      return { content }
    }
    const body = {}
    if (content.content != null) body.content = content.content
    if (content.embeds) body.embeds = content.embeds.map(e =>
      typeof e.toJSON === 'function' ? e.toJSON() : e
    )
    if (content.components) body.components = content.components.map(c =>
      typeof c.toJSON === 'function' ? c.toJSON() : c
    )
    if (content.flags) body.flags = content.flags
    if (content.ephemeral) body.flags = (body.flags || 0) | MessageFlags.Ephemeral
    if (content.allowed_mentions) body.allowed_mentions = content.allowed_mentions
    return body
  }

  /**
   * Normalize a raw Discord API message response to look like a discord.js Message.
   * Maps snake_case fields to camelCase so callers can use response.channelId, etc.
   */
  _normalizeMessage (raw) {
    if (!raw || typeof raw !== 'object') return raw
    if (!raw.channel_id && raw.channelId) return raw // already normalized
    return {
      ...raw,
      channelId: raw.channel_id ?? raw.channelId,
      guildId: raw.guild_id ?? raw.guildId,
      components: raw.components || []
    }
  }
}

module.exports = InteractionAdapter


