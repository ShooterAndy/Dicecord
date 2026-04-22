require('dotenv').config()
const express = require('express')
const { verifyKeyMiddleware } = require('discord-interactions')
const { InteractionType } = require('discord-api-types/v10')
const { Routes } = require('discord-api-types/v10')
const { Collection } = require('discord.js')
const fs = require('fs')
const path = require('path')

const logger = require('./helpers/logger')
const nws = require('./helpers/nws')
const pg = require('./helpers/pgHandler')
const InteractionAdapter = require('./helpers/interactionAdapter')
const pendingInteractions = require('./helpers/pendingInteractions')
const getRest = require('./helpers/rest')
const {
  CUSTOM_DECK_TYPE,
  DECK_TYPES_COLUMNS,
  DECK_TYPES_DB_NAME,
  SAVED_COMMANDS_COLUMNS,
  SAVED_COMMANDS_DB_NAME,
  SAVED_CMD_SCOPE_PERSONAL,
  SAVED_CMD_SCOPE_GUILD,
  SAVED_COMMANDS_EXPIRE_AFTER,
  DECKS_DB_NAME,
  DECKS_COLUMNS,
  DECKS_EXPIRE_AFTER,
  IS_LOCAL
} = require('./helpers/constants')
const { transformMinutesToMs, transformHoursToMs } = require('./helpers/utilities')
const retryable = require('./helpers/retryableDiscordRequest')
const replyOrFollowUp = require('./helpers/replyOrFollowUp')

const app = express()
const PORT = process.env.PORT || 3000
const PUBLIC_KEY = process.env.PUBLIC_KEY
const APPLICATION_ID = process.env.APP_ID

if (!PUBLIC_KEY) {
  console.error('PUBLIC_KEY env var is required')
  process.exit(1)
}
if (!APPLICATION_ID) {
  console.error('APP_ID env var is required')
  process.exit(1)
}

process.on('unhandledRejection', error => {
  logger.error('Unhandled promise rejection', error)
})

// ---------------------------------------------------------------------------
// Load slash commands
// ---------------------------------------------------------------------------
const slashCommands = new Collection()
const commandFiles = fs.readdirSync('./slashCommands').filter(f => f.endsWith('.js'))
for (const file of commandFiles) {
  const command = require(`./slashCommands/${file}`)
  slashCommands.set(command.data.name, command)
}

// ---------------------------------------------------------------------------
// Deck types cache (same as old client.js)
// ---------------------------------------------------------------------------
let deckTypesCache = {}
const cacheDeckTypes = async () => {
  const result = await pg.db.any(
    'SELECT ${id~},${description~},${deck~} FROM ${db#} ORDER BY ${id~} ASC', {
      id: DECK_TYPES_COLUMNS.id,
      description: DECK_TYPES_COLUMNS.description,
      deck: DECK_TYPES_COLUMNS.deck,
      db: pg.addPrefix(DECK_TYPES_DB_NAME)
    })
  if (!result || !result.length) return logger.error('The list of deck types appears to be empty')
  result.forEach(deck => {
    deckTypesCache[deck.id] = { description: deck.description, deck: deck.deck }
  })
}

// ---------------------------------------------------------------------------
// Help autocomplete (extracted from old client.js)
// ---------------------------------------------------------------------------
const handleHelpAutocomplete = async (adapter) => {
  const focusedValue = adapter.options.getFocused().toLowerCase()
  const helpPath = path.join('help')
  const helpFiles = fs.readdirSync(helpPath).filter(file => file.endsWith('.md'))
  const choices = []
  for (let file of helpFiles) {
    file = file.toLowerCase().replace('.md', '')
    if (file !== '!') choices.push(file)
  }
  const { ROLL_TOPICS, ROLL_ALL_TOPICS, TOPICS_TOPIC, GENERAL_TOPICS } = require('./commandHandlers/help')
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
  const filtered = [...new Set(
    [...filteredExact, ...filteredPriority, ...filteredChoices, ...filteredDetail]
  )]
    .slice(0, 25)
  await adapter.respond(
    filtered.map(choice => ({ name: choice, value: choice }))
  )
}

// ---------------------------------------------------------------------------
// Deck autocomplete
// ---------------------------------------------------------------------------
const handleDeckAutocomplete = async (adapter) => {
  const focusedOption = adapter.options.getFocused(true)
  const focusedValue = focusedOption.value
  const choices = []
  if (focusedOption.name === 'deck') {
    for (let deckType in deckTypesCache) {
      choices.push(deckType)
    }
    if (adapter.commandName !== 'examinedeck') {
      choices.push(CUSTOM_DECK_TYPE)
    }
  }
  const filtered = choices.filter(choice => choice.startsWith(focusedValue))
  await adapter.respond(
    filtered.map(choice => ({ name: choice, value: choice }))
  )
}

// ---------------------------------------------------------------------------
// Saved commands autocomplete
// ---------------------------------------------------------------------------
const Client = require('./helpers/client')

const handleSavedCmdAutocomplete = async (adapter) => {
  const focusedValue = adapter.options.getFocused()
  const guildId = adapter.guildId

  // Personal commands
  let personalNames = Client.getSavedCmdNamesCache(adapter.user.id)
  if (!personalNames) {
    personalNames = []
    try {
      const result = await pg.db.any(
        'SELECT ${name~} FROM ${db#} WHERE ${userId~} = ${userIdValue} AND ${guildId~} IS NULL',
        {
          name: SAVED_COMMANDS_COLUMNS.name,
          db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
          userId: SAVED_COMMANDS_COLUMNS.user_id,
          userIdValue: adapter.user.id,
          guildId: SAVED_COMMANDS_COLUMNS.guild_id
        })
      if (result && result.length) {
        result.forEach(command => personalNames.push(command.name))
      }
      Client.setSavedCmdNamesCache(adapter.user.id, personalNames)
    } catch (error) {
      logger.log('Failed to get personal saved commands for autocomplete', error)
    }
  }

  // Guild commands
  let guildEntries = []
  if (guildId) {
    guildEntries = Client.getGuildSavedCmdNamesCache(guildId)
    if (!guildEntries) {
      guildEntries = []
      try {
        const result = await pg.db.any(
          'SELECT ${name~}, ${userId~} FROM ${db#} WHERE ${guildId~} = ${guildIdValue}',
          {
            name: SAVED_COMMANDS_COLUMNS.name,
            userId: SAVED_COMMANDS_COLUMNS.user_id,
            db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
            guildId: SAVED_COMMANDS_COLUMNS.guild_id,
            guildIdValue: guildId
          })
        if (result && result.length) {
          result.forEach(command => {
            guildEntries.push({ name: command.name, userId: command.user_id })
          })
        }
        Client.setGuildSavedCmdNamesCache(guildId, guildEntries)
      } catch (error) {
        logger.log('Failed to get guild saved commands for autocomplete', error)
      }
    }
  }

  const choices = []
  personalNames.forEach(name => {
    choices.push({
      name: guildId ? `${name} (yours)` : name,
      value: SAVED_CMD_SCOPE_PERSONAL + name
    })
  })
  guildEntries.forEach(entry => {
    choices.push({
      name: `${entry.name} (server-wide)`,
      value: SAVED_CMD_SCOPE_GUILD + entry.name
    })
  })

  const filtered = choices
    .filter(c => c.name.startsWith(focusedValue) ||
      c.value.endsWith(focusedValue) ||
      c.name.split(' (')[0].startsWith(focusedValue))
    .slice(0, 25)
  await adapter.respond(filtered)
}

// ---------------------------------------------------------------------------
// Autocomplete router
// ---------------------------------------------------------------------------
const handleAutocomplete = async (adapter) => {
  try {
    if (adapter.commandName === 'help') {
      await handleHelpAutocomplete(adapter)
    } else if (['examinedeck', 'shuffle', 'drawshuffled'].includes(adapter.commandName)) {
      await handleDeckAutocomplete(adapter)
    } else if (['examinesaved', 'deletesaved', 'executesaved'].includes(adapter.commandName)) {
      await handleSavedCmdAutocomplete(adapter)
    }
  } catch (error) {
    logger.log(`Failed to handle autocomplete for ${adapter.commandName}`, error)
  }
}

// ---------------------------------------------------------------------------
// Interaction endpoint
// ---------------------------------------------------------------------------
app.post('/interactions',
  verifyKeyMiddleware(PUBLIC_KEY),
  async (req, res) => {
    const raw = req.body
    const adapter = new InteractionAdapter(raw, res)

    try {
      // --- Application Command (slash command) ---
      if (adapter.isCommand()) {
        const command = slashCommands.get(adapter.commandName)
        if (!command) {
          return res.status(404).json({ error: 'Unknown command' })
        }
        try {
          await command.execute(adapter)
        } catch (error) {
          if (error?.code === 10062) {
            logger.warn(`Interaction expired before ${adapter.commandName} could be processed`)
            return
          }
          logger.error(`Failed while trying to execute a ${adapter.commandName} command`, error)
          // Try to inform the user
          try {
            await replyOrFollowUp(adapter, {
              content: `Failed to execute the \`${adapter.commandName}\` command. Please contact the bot creator.`,
              ephemeral: true
            })
          } catch {}
        }
        return
      }

      // --- Autocomplete ---
      if (adapter.isAutocomplete()) {
        await handleAutocomplete(adapter)
        return
      }

      // --- Modal Submit ---
      if (adapter.isModalSubmit()) {
        // Try to resolve via pending interactions (customId-based)
        if (pendingInteractions.tryResolve(adapter.customId, adapter)) {
          return // handled by pending handler
        }

        // Also try iterating pending entries with filters
        for (const [key, entry] of pendingInteractions._getEntries()) {
          if (key.startsWith('modal-await:') && entry.filter) {
            if (entry.filter(adapter)) {
              clearTimeout(entry.timer)
              pendingInteractions._delete(key)
              entry.resolve(adapter)
              return
            }
          }
        }

        // No pending handler — this shouldn't normally happen
        logger.warn(`Received unhandled modal submit: ${adapter.customId}`)
        if (!res.headersSent) {
          adapter.deferReply()
        }
        return
      }

      // --- Button ---
      if (adapter.isButton()) {
        const messageId = raw.message?.id
        if (messageId && pendingInteractions.tryDispatchButton(messageId, adapter)) {
          return // handled by collector
        }
        // Unhandled button
        logger.warn(`Received unhandled button click: ${adapter.customId}`)
        if (!res.headersSent) {
          adapter.deferReply()
        }
        return
      }

      // Unknown interaction type
      if (!res.headersSent) {
        res.status(400).json({ error: 'Unknown interaction type' })
      }
    } catch (error) {
      logger.error('Error processing interaction', error)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal error' })
      }
    }
  }
)

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', version: require('./package.json').version })
})

// ---------------------------------------------------------------------------
// DB cleanup (moved from events/ready.js)
// ---------------------------------------------------------------------------
const deleteExpiredSavedCommands = async () => {
  try {
    const result = await pg.db.any(
      'DELETE FROM ${db#} WHERE ${timestamp~} < NOW() - INTERVAL ${interval} RETURNING *',
      {
        db: SAVED_COMMANDS_DB_NAME,
        timestamp: SAVED_COMMANDS_COLUMNS.timestamp,
        interval: SAVED_COMMANDS_EXPIRE_AFTER
      })
    if (result && result.length) {
      logger.log(`Deleted ${result.length} saved commands older than ${SAVED_COMMANDS_EXPIRE_AFTER}.`)
    }
  } catch (error) {
    logger.error('Failed to delete expired commands', error)
  }
}

const deleteExpiredDecks = async () => {
  try {
    const result = await pg.db.any(
      'DELETE FROM ${db#} WHERE ${timestamp~} < NOW() - INTERVAL ${interval} RETURNING *',
      {
        db: DECKS_DB_NAME,
        timestamp: DECKS_COLUMNS.timestamp,
        interval: DECKS_EXPIRE_AFTER
      })
  } catch (error) {
    logger.error('Failed to delete expired decks', error)
  }
}

// ---------------------------------------------------------------------------
// Memory monitoring (simplified — single process)
// ---------------------------------------------------------------------------
const DYNO_QUOTA_MB = 1024
const MEMORY_POLL_MS = 60_000
const MEMORY_WARN_RATIO = 0.90
const MEMORY_CRIT_RATIO = 1.00
const MEMORY_HOURLY_INTERVAL = 60
let _memoryTickCount = 0
const _formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(1)

const _readCgroupMemoryBytes = () => {
  try {
    const val = fs.readFileSync('/sys/fs/cgroup/memory.current', 'utf8').trim()
    return parseInt(val, 10) || null
  } catch {}
  try {
    const val = fs.readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf8').trim()
    return parseInt(val, 10) || null
  } catch {}
  return null
}

const collectMemoryStats = () => {
  _memoryTickCount++
  const mem = process.memoryUsage()
  const cgroupBytes = _readCgroupMemoryBytes()
  const cgroupMB = cgroupBytes ? cgroupBytes / 1024 / 1024 : null
  const rssMB = mem.rss / 1024 / 1024
  const effectiveMB = cgroupMB ?? rssMB
  const ratio = effectiveMB / DYNO_QUOTA_MB
  const isWarning = ratio >= MEMORY_WARN_RATIO
  const isCritical = ratio >= MEMORY_CRIT_RATIO
  const isHourlyTick = _memoryTickCount % MEMORY_HOURLY_INTERVAL === 0

  const cgroupNote = cgroupMB
    ? ` (cgroup=${cgroupMB.toFixed(1)}MB, rss=${rssMB.toFixed(1)}MB)`
    : ''
  const line = nws`[MEMORY] ${effectiveMB.toFixed(1)}MB / ${DYNO_QUOTA_MB}MB \
    (${(ratio * 100).toFixed(0)}%)${cgroupNote} \
    heap=${_formatMB(mem.heapUsed)}/${_formatMB(mem.heapTotal)}MB \
    pending=${pendingInteractions.size}`

  if (isWarning) console.log(line)
  if (isHourlyTick) {
    logger.log(line)
  } else if (isCritical) {
    logger.error(line)
  }
}

// ---------------------------------------------------------------------------
// Top.gg stats (using REST API instead of guild cache)
// ---------------------------------------------------------------------------
const postBotStats = async () => {
  if (!process.env.DBL_TOKEN) return
  try {
    const rest = getRest()
    const appInfo = await rest.get(Routes.currentApplication())
    const guildCount = appInfo.approximate_guild_count ?? 0
    logger.log(`Approximate guild count from API: ${guildCount}`)

    const { Api } = require('@top-gg/sdk')
    const topGGApi = new Api(process.env.DBL_TOKEN)
    await topGGApi.postStats({
      serverCount: guildCount,
      shardCount: 1
    })
    logger.log(`Posted stats to top.gg: ${guildCount} total guilds`)
  } catch (err) {
    logger.error('Failed to post bot stats', err)
  }
}

// ---------------------------------------------------------------------------
// Update bot description with version on startup
// ---------------------------------------------------------------------------
const updateBotDescription = async () => {
  try {
    const version = require('./package.json').version
    const rest = getRest()
    await rest.patch(Routes.currentApplication(), {
      body: {
        description: `Dicecord v${version} — A dice rolling bot for tabletop RPGs. Type /help to get started.`
      }
    })
    logger.log(`Updated application description to v${version}`)
  } catch (err) {
    logger.error('Failed to update application description', err)
  }
}

// ---------------------------------------------------------------------------
// Minimal gateway sidecar — just for presence (online status + activity text)
// ---------------------------------------------------------------------------
const startPresenceGateway = async () => {
  try {
    const Discord = require('discord.js')
    const { GatewayIntentBits, ActivityType } = Discord
    const version = require('./package.json').version

    // Fetch recommended shard count from Discord
    const rest = getRest()
    const gatewayInfo = await rest.get(Routes.gatewayBot())
    const shardCount = gatewayInfo.shards || 1
    const shards = Array.from({ length: shardCount }, (_, i) => i) // [0, 1, 2, ...]

    logger.log(`Presence gateway: using ${shardCount} shard(s)`)

    const presenceClient = new Discord.Client({
      intents: [GatewayIntentBits.Guilds],
      shards,
      shardCount,
      // Minimal caches — we don't need any data, just presence
      makeCache: Discord.Options.cacheWithLimits({
        MessageManager: 0,
        PresenceManager: 0,
        ThreadManager: 0,
        GuildMemberManager: 0,
        GuildBanManager: 0,
        GuildInviteManager: 0,
        GuildStickerManager: 0,
        GuildScheduledEventManager: 0,
        GuildEmojiManager: 0,
        BaseGuildEmojiManager: 0,
        ReactionManager: 0,
        ReactionUserManager: 0,
        StageInstanceManager: 0,
        ThreadMemberManager: 0,
        UserManager: 0,
        VoiceStateManager: 0,
        ApplicationCommandManager: 0
      }),
      presence: {
        status: 'online',
        activities: [{
          name: `v${version}, type /help`,
          type: ActivityType.Custom
        }]
      }
    })

    presenceClient.on('clientReady', () => {
      logger.log(`Presence gateway connected as ${presenceClient.user.tag}`)
    })

    presenceClient.on('error', err => {
      logger.error('Presence gateway error', err)
    })

    // Don't handle any interactions — those go through HTTP
    // Just login to maintain presence
    await presenceClient.login(process.env.BOT_TOKEN)
    return presenceClient
  } catch (err) {
    logger.error('Failed to start presence gateway', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
const start = async () => {
  // Cache deck types
  await cacheDeckTypes()

  // Update bot description
  await updateBotDescription()

  // Start periodic tasks
  if (!IS_LOCAL) {
    await deleteExpiredDecks()
    setInterval(deleteExpiredDecks, transformHoursToMs(6))
    await deleteExpiredSavedCommands()
    setInterval(deleteExpiredSavedCommands, transformHoursToMs(6))
  }

  // Memory monitoring
  setInterval(collectMemoryStats, MEMORY_POLL_MS)
  collectMemoryStats()

  // Top.gg stats
  await postBotStats()
  setInterval(postBotStats, transformMinutesToMs(30))

  // Start HTTP server
  app.listen(PORT, () => {
    logger.log(`HTTP interactions server started on port ${PORT}`)
  })

  // Start minimal gateway for presence (non-blocking — failures don't prevent startup)
  await startPresenceGateway()
}

start().catch(err => {
  logger.error('Failed to start server', err)
  process.exit(1)
})

// Graceful shutdown
const shutdown = async (signal) => {
  logger.log(`Received ${signal}, shutting down gracefully...`)
  try {
    pg.db.$pool.end()
  } catch (err) {
    logger.error('Error closing DB pool during shutdown', err)
  }
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))





