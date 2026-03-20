const Discord = require('discord.js')
const {
  LOG_PREFIX,
  DECK_TYPES_COLUMNS,
  DECK_TYPES_DB_NAME,
  CUSTOM_DECK_TYPE,
  SAVED_COMMANDS_COLUMNS,
  SAVED_COMMANDS_DB_NAME,
  GUILD_SETTINGS_DB_NAME,
  GUILD_SETTINGS_COLUMNS,
  GUILD_SETTINGS_DEFAULTS
} = require('./constants')
const nws = require('./nws')
const logger = require('./logger')
const {
  GatewayIntentBits,
} = require('discord.js')
const fs = require('fs')
const path = require('path')
const pg = require('./pgHandler')
const replyOrFollowUp = require('./replyOrFollowUp')
const retryable = require('./retryableDiscordRequest')
const { ClusterClient, getInfo } = require('discord-hybrid-sharding')

const _getEntityFromBroadcastResponse = (response) => {
  if (!response) {
    logger.error(`Empty response from broadcastEval`)
    return null
  }
  if (!response.length) {
    logger.warn(`Have not found an entity in a broadcastEval lookup`)
    return null
  }
  let entity = null
  let count = 0
  while (entity === null && count < response.length) {
    if (response[count]) {
      entity = response[count]
    }
    count++
  }
  return entity
}

const _getChannelById = async (clientOrShard, { id }) => {
  if (!clientOrShard || !clientOrShard.channels) {
    throw `Missing client channels data in _getChannelById for channel ${id}`
  }
  try {
    return clientOrShard.channels.fetch(id).catch(err => {
      logger.error(nws`Failed to fetch channel ${id} in _getChannelById`,
        err)
      return null
    })
  } catch (err) {
    throw err
  }
}

const ROLL_CACHE_MAX_SIZE = 1000
const ROLL_CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes
const ROLL_CACHE_SWEEP_INTERVAL_MS = 5 * 60 * 1000 // sweep every 5 minutes

const _rollCache = new Map()       // id -> data
const _rollCacheTs = new Map()     // id -> timestamp

const _sweepRollCache = () => {
  const now = Date.now()
  for (const [id, ts] of _rollCacheTs) {
    if (now - ts > ROLL_CACHE_TTL_MS) {
      _rollCache.delete(id)
      _rollCacheTs.delete(id)
    }
  }
}

setInterval(_sweepRollCache, ROLL_CACHE_SWEEP_INTERVAL_MS)

// --- Saved-command-names autocomplete cache (per user, short TTL) ---
const SAVED_CMD_CACHE_MAX_SIZE = 500
const SAVED_CMD_CACHE_TTL_MS = 60 * 1000 // 60 seconds
const SAVED_CMD_CACHE_SWEEP_INTERVAL_MS = 30 * 1000

const _savedCmdCache = new Map()   // userId -> string[]
const _savedCmdCacheTs = new Map() // userId -> timestamp

const _sweepSavedCmdCache = () => {
  const now = Date.now()
  for (const [id, ts] of _savedCmdCacheTs) {
    if (now - ts > SAVED_CMD_CACHE_TTL_MS) {
      _savedCmdCache.delete(id)
      _savedCmdCacheTs.delete(id)
    }
  }
}

setInterval(_sweepSavedCmdCache, SAVED_CMD_CACHE_SWEEP_INTERVAL_MS)

// --- Guild-settings cache (plain_text flag, per guild, long TTL) ---
const GUILD_SETTINGS_CACHE_MAX_SIZE = 500
const GUILD_SETTINGS_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const GUILD_SETTINGS_CACHE_SWEEP_INTERVAL_MS = 5 * 60 * 1000

const _guildSettingsCache = new Map()    // guildId -> { plainText: boolean }
const _guildSettingsCacheTs = new Map()  // guildId -> timestamp

const _sweepGuildSettingsCache = () => {
  const now = Date.now()
  for (const [id, ts] of _guildSettingsCacheTs) {
    if (now - ts > GUILD_SETTINGS_CACHE_TTL_MS) {
      _guildSettingsCache.delete(id)
      _guildSettingsCacheTs.delete(id)
    }
  }
}

setInterval(_sweepGuildSettingsCache, GUILD_SETTINGS_CACHE_SWEEP_INTERVAL_MS)

const Client = module.exports = {

  client: null,
  deckTypesCache: {},
  isReady: false,

  // --- rollThrowsCache helpers (bounded Map with TTL) ---
  getRollCache (id) {
    return _rollCache.get(id) ?? null
  },
  setRollCache (id, data) {
    // Evict oldest entries if we've hit the size cap
    if (_rollCache.size >= ROLL_CACHE_MAX_SIZE) {
      const oldestId = _rollCacheTs.keys().next().value
      _rollCache.delete(oldestId)
      _rollCacheTs.delete(oldestId)
    }
    _rollCache.set(id, data)
    _rollCacheTs.set(id, Date.now())
  },
  hasRollCache (id) {
    return _rollCache.has(id)
  },
  deleteRollCache (id) {
    _rollCache.delete(id)
    _rollCacheTs.delete(id)
  },

  // --- savedCommandNames cache helpers (bounded Map with TTL) ---
  getSavedCmdNamesCache (userId) {
    if (!_savedCmdCache.has(userId)) return null
    const ts = _savedCmdCacheTs.get(userId)
    if (Date.now() - ts > SAVED_CMD_CACHE_TTL_MS) {
      _savedCmdCache.delete(userId)
      _savedCmdCacheTs.delete(userId)
      return null
    }
    return _savedCmdCache.get(userId)
  },
  setSavedCmdNamesCache (userId, names) {
    if (_savedCmdCache.size >= SAVED_CMD_CACHE_MAX_SIZE) {
      const oldestId = _savedCmdCacheTs.keys().next().value
      _savedCmdCache.delete(oldestId)
      _savedCmdCacheTs.delete(oldestId)
    }
    _savedCmdCache.set(userId, names)
    _savedCmdCacheTs.set(userId, Date.now())
  },
  invalidateSavedCmdNamesCache (userId) {
    _savedCmdCache.delete(userId)
    _savedCmdCacheTs.delete(userId)
  },

  // --- Guild-settings helpers ---
  async getPlainTextMode (guildId) {
    if (!guildId) return false
    // Check cache first
    if (_guildSettingsCache.has(guildId)) {
      const ts = _guildSettingsCacheTs.get(guildId)
      if (Date.now() - ts <= GUILD_SETTINGS_CACHE_TTL_MS) {
        return _guildSettingsCache.get(guildId).plainText
      }
      _guildSettingsCache.delete(guildId)
      _guildSettingsCacheTs.delete(guildId)
    }
    // Fetch from DB
    try {
      const row = await pg.db.oneOrNone(
        'SELECT ${plainText~} FROM ${db#} WHERE ${guildId~} = ${guildIdValue}',
        {
          plainText: GUILD_SETTINGS_COLUMNS.plain_text,
          db: pg.addPrefix(GUILD_SETTINGS_DB_NAME),
          guildId: GUILD_SETTINGS_COLUMNS.guild_id,
          guildIdValue: guildId
        }
      )
      const value = !!(row && row[GUILD_SETTINGS_COLUMNS.plain_text])
      this._cacheGuildSetting(guildId, value)
      return value
    } catch (err) {
      logger.error(`Failed to fetch guild settings for guild "${guildId}"`, err)
      return false
    }
  },

  async setPlainTextMode (guildId, enabled) {
    try {
      if (this._areAllSettingsDefault({ [GUILD_SETTINGS_COLUMNS.plain_text]: enabled })) {
        // All settings are defaults — remove the row to save space
        await pg.db.none(
          'DELETE FROM ${db#} WHERE ${guildId~} = ${guildIdValue}',
          {
            db: pg.addPrefix(GUILD_SETTINGS_DB_NAME),
            guildId: GUILD_SETTINGS_COLUMNS.guild_id,
            guildIdValue: guildId
          }
        )
      } else {
        await pg.db.none(
          `INSERT INTO \${db#} (\${guildId~}, \${plainText~})
           VALUES (\${guildIdValue}, \${enabledValue})
           ON CONFLICT (\${guildId~})
           DO UPDATE SET \${plainText~} = \${enabledValue}`,
          {
            db: pg.addPrefix(GUILD_SETTINGS_DB_NAME),
            guildId: GUILD_SETTINGS_COLUMNS.guild_id,
            plainText: GUILD_SETTINGS_COLUMNS.plain_text,
            guildIdValue: guildId,
            enabledValue: enabled
          }
        )
      }
      this._cacheGuildSetting(guildId, enabled)
    } catch (err) {
      logger.error(`Failed to set plain_text for guild "${guildId}"`, err)
      throw err
    }
  },

  // Returns true when every setting in the given object matches its default value.
  _areAllSettingsDefault (settings) {
    return Object.keys(GUILD_SETTINGS_DEFAULTS).every(key =>
      settings[key] === GUILD_SETTINGS_DEFAULTS[key]
    )
  },

  _cacheGuildSetting (guildId, plainText) {
    if (_guildSettingsCache.size >= GUILD_SETTINGS_CACHE_MAX_SIZE) {
      const oldestId = _guildSettingsCacheTs.keys().next().value
      _guildSettingsCache.delete(oldestId)
      _guildSettingsCacheTs.delete(oldestId)
    }
    _guildSettingsCache.set(guildId, { plainText })
    _guildSettingsCacheTs.set(guildId, Date.now())
  },

  async tryToLogIn (errorsCount, previousError, currentError) {
    const MAX_LOGIN_RETRIES = 10
    if (currentError) {
      previousError = currentError
      errorsCount++
    }
    if (errorsCount >= MAX_LOGIN_RETRIES) {
      logger.error(nws`${LOG_PREFIX} Failed to log in after ${MAX_LOGIN_RETRIES} attempts, \
        giving up. Last error:`, previousError)
      process.exit(1)
    }
    try {
      await this.client.login(process.env.BOT_TOKEN)
      if (errorsCount) {
        logger.error(nws`${LOG_PREFIX} Had ${errorsCount} errors trying to log in, the latest \
          being`, previousError)
      }
    } catch (error) {
      const delay = Math.min(1000 * Math.pow(2, errorsCount), 30000)
      logger.warn(nws`${LOG_PREFIX} Login attempt ${errorsCount + 1} failed, \
        retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      await this.tryToLogIn(errorsCount, previousError, error)
    }
  },

  async getChannelById (id) {
    try {
      // Try local fetch first — avoids expensive cross-cluster IPC
      const localChannel = await _getChannelById(this.client, { id })
      if (localChannel) return localChannel

      // Fall back to broadcast only if this cluster doesn't have the channel
      if (this.client.cluster) {
        const response =
            await this.client.cluster.broadcastEval(_getChannelById, { context: { id } })
        return _getEntityFromBroadcastResponse(response)
      }
      return null
    } catch (err) {
      throw err
    }
  },

  async cacheDeckTypes () {
    const result = await pg.db.any(
      'SELECT ${id~},${description~},${deck~} FROM ${db#} ORDER BY ${id~} ASC', {
        id: DECK_TYPES_COLUMNS.id,
        description: DECK_TYPES_COLUMNS.description,
        deck: DECK_TYPES_COLUMNS.deck,
        db: pg.addPrefix(DECK_TYPES_DB_NAME)
      })
    if (!result || !result.length) return logger.error(`The list of deck types appears to be empty`)

    result.forEach(deck => {
      this.deckTypesCache[deck.id] = { description: deck.description, deck: deck.deck }
    })
  },

  async readyBasics (slashCommands) {
    let options = { }
    options.shards = getInfo().SHARD_LIST // An array of shards that will get spawned
    options.shardCount = getInfo().TOTAL_SHARDS // Total number of shards

    options.intents = [
      GatewayIntentBits.Guilds
    ]
    options.makeCache = Discord.Options.cacheWithLimits({
      MessageManager: 0,
      PresenceManager: 0,
      ThreadManager: 0,
      ApplicationCommandManager: 0, // guild.commands
      BaseGuildEmojiManager: 0, // guild.emojis
      GuildBanManager: 0, // guild.bans
      GuildInviteManager: 0, // guild.invites
      GuildManager: Infinity, // client.guilds
      GuildMemberManager: 0, // guild.members
      GuildStickerManager: 0, // guild.stickers
      GuildScheduledEventManager: 0, // guild.scheduledEvents
      ReactionManager: 0, // message.reactions
      ReactionUserManager: 0, // reaction.users
      StageInstanceManager: 0, // guild.stageInstances
      ThreadMemberManager: 0, // threadChannel.members
      UserManager: 0, // client.users
      VoiceStateManager: 0, // guild.voiceStates
    })

    // Sweepers clean up stale entries that accumulate despite makeCache limits.
    // ChannelManager can't be limited via makeCache, so the sweeper is essential.
    options.sweepers = {
      ...Discord.Options.DefaultSweeperSettings,
      messages: {
        interval: 600,   // every 10 minutes (seconds)
        lifetime: 300    // older than 5 minutes
      },
      users: {
        interval: 600,
        filter: Discord.Sweepers.filterByLifetime({
          lifetime: 600  // 10 minutes
        })
      },
      threads: {
        interval: 600,
        lifetime: 600
      }
    }
    Client.client = new Discord.Client(options)
    Client.client.cluster = new ClusterClient(Client.client)

    //This is quite a hack, but I couldn't find a better way
    Client.client.functions = {
      getChannelById: _getChannelById
    }

    await this.cacheDeckTypes()

    Client.client.on('error', async error =>
        await require(`../events/error`)(Client.client, error))
    Client.client.on('clientReady', async () =>
        await require(`../events/ready`)(Client.client))

    const safeThis = this

    Client.client.on('interactionCreate', async interaction => {
      if (!safeThis.isReady) {
        return
      }
      if (interaction.isCommand()) {
        if (!interaction.commandName) return
        const command = slashCommands.get(interaction.commandName)
        if (!command) return
        try {
          await command.execute(interaction)
        } catch (error) {
          if (error?.code === 10062) {
            logger.warn(`Interaction expired before ${interaction.commandName} could be processed`)
            return
          }
          logger.error(`Failed while trying to execute a ${interaction.commandName} command`, error)
          await replyOrFollowUp(interaction, {
            content: `Failed to execute the \`${interaction.commandName}\` command. Please contact the bot creator.`,
            ephemeral: true
          })
        }
      } else if (interaction.isAutocomplete()) {
        // special case for /help
        if (interaction.commandName === 'help') {
          const focusedValue = interaction.options.getFocused().toLowerCase()
          const helpPath = path.join('help')
          const helpFiles = fs.readdirSync(helpPath).filter(file => file.endsWith('.md'))
          const choices = []
          for (let file of helpFiles) {
            file = file.toLowerCase().replace('.md', '')
            if (file !== '!') {
              choices.push(file)
            }
          }
          // Add roll topic entries (modifiers, dice types, syntax)
          // Priority choices (category overviews) come first so they aren't pushed
          // past the 25-item Discord autocomplete limit by individual entries
          const { ROLL_TOPICS, ROLL_ALL_TOPICS, TOPICS_TOPIC, GENERAL_TOPICS } = require('../commandHandlers/help')
          const priorityChoices = [TOPICS_TOPIC, ...GENERAL_TOPICS, ROLL_ALL_TOPICS]
          const detailChoices = []
          for (const category of Object.values(ROLL_TOPICS)) {
            priorityChoices.push(category.listTopic)
            for (const key of Object.keys(category.descriptions)) {
              detailChoices.push(category.prefix + key)
            }
          }
          const filteredPriority = priorityChoices.filter(c => c.startsWith(focusedValue))
          const filteredExact = choices.filter(c => c === focusedValue)
          const filteredChoices = choices.filter(c => c.startsWith(focusedValue) && c !== focusedValue)
          const filteredDetail = detailChoices.filter(c => c.startsWith(focusedValue))
          const filtered = [...filteredExact, ...filteredPriority, ...filteredChoices, ...filteredDetail]
            .slice(0, 25) // Discord autocomplete limit
          await retryable(
            () => interaction.respond(
              filtered.map(choice => ({ name: choice, value: choice }))
            )
          ).catch(error => {
            logger.log(`Failed to send autocomplete options for ${interaction.commandName}`, error)
          })
        } else if ((interaction.commandName === 'examinedeck') ||
          (interaction.commandName === 'shuffle') ||
          (interaction.commandName === 'drawshuffled')) {
          const focusedOption = interaction.options.getFocused(true)
          const focusedValue = focusedOption.value
          const choices = []
          if (focusedOption.name === 'deck') {
            for (let deckType in this.deckTypesCache) {
              choices.push(deckType)
            }
            if (interaction.commandName !== 'examinedeck') {
              choices.push(CUSTOM_DECK_TYPE)
            }
          }
          const filtered = choices.filter(choice => choice.startsWith(focusedValue))
          await retryable(
            () => interaction.respond(
              filtered.map(choice => ({ name: choice, value: choice }))
            )
          ).catch(error => {
            logger.log(`Failed to send autocomplete options for ${interaction.commandName}`, error)
          })
        } else if ((interaction.commandName === 'examinesaved') ||
          (interaction.commandName === 'deletesaved') ||
          (interaction.commandName === 'executesaved')) {
          const focusedValue = interaction.options.getFocused()
          let choices = safeThis.getSavedCmdNamesCache(interaction.user.id)
          if (!choices) {
            choices = []
            try {
              const result = await pg.db.any(
                'SELECT ${name~} FROM ${db#} WHERE ${userId~} = ${userIdValue}',
                {
                  name: SAVED_COMMANDS_COLUMNS.name,
                  db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
                  userId: SAVED_COMMANDS_COLUMNS.user_id,
                  userIdValue: interaction.user.id
                })

              if (result && result.length) {
                result.forEach(command => {
                  choices.push(command.name)
                })
              }
              safeThis.setSavedCmdNamesCache(interaction.user.id, choices)
            } catch(error) {
              logger.log(`Failed to get the list of saved commands for autocomplete`, error)
            }
          }
          const filtered = choices.filter(choice => choice.startsWith(focusedValue))
          await retryable(
            () => interaction.respond(
              filtered.map(choice => ({ name: choice, value: choice }))
            )
          ).catch(error => {
            logger.log(`Failed to send autocomplete options for ${interaction.commandName}`, error)
          })
        }

        // TODO: write a generic handler with a nested object in constants
        /*if (interaction.commandName === 'help') {
          const focusedOption = interaction.options.getFocused(true)
          let choices

          if (focusedOption.name === 'name') {
            choices = ['faq', 'install', 'collection', 'promise', 'debug'];
          }

          if (focusedOption.name === 'theme') {
            choices = ['halloween', 'christmas', 'summer'];
          }

          const filtered = choices.filter(choice => choice.startsWith(focusedOption.value));
          await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice })),
          );
        }*/
      } else if (interaction.isButton()) {
        //interaction.message.id
      }
    })

    logger.log('Trying to log in...')
    await Client.tryToLogIn(0, null, null)
    this.isReady = true
  }
}