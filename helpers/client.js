const Discord = require('discord.js')
const {
  LOG_PREFIX,
  DECK_TYPES_COLUMNS,
  DECK_TYPES_DB_NAME,
  CUSTOM_DECK_TYPE,
  SAVED_COMMANDS_COLUMNS,
  SAVED_COMMANDS_DB_NAME,
  SAVED_CMD_SCOPE_PERSONAL,
  SAVED_CMD_SCOPE_GUILD,
  GUILD_SETTINGS_DB_NAME,
  GUILD_SETTINGS_COLUMNS,
  GUILD_SETTINGS_DEFAULTS
} = require('./constants')
const nws = require('./nws')
const logger = require('./logger')
const {
  GatewayIntentBits,
} = require('discord.js')
const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v10')
const fs = require('fs')
const path = require('path')
const pg = require('./pgHandler')
const replyOrFollowUp = require('./replyOrFollowUp')
const retryable = require('./retryableDiscordRequest')
const getRest = require('./rest')

// REST-only client stub for editMessage.js and logger.js compatibility
let _restClient = null
const _getRestClient = () => {
  if (!_restClient) {
    _restClient = { rest: getRest() }
  }
  return _restClient
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

// --- Guild-saved-command-names autocomplete cache (per guild, short TTL) ---
const GUILD_SAVED_CMD_CACHE_MAX_SIZE = 500
const GUILD_SAVED_CMD_CACHE_TTL_MS = 60 * 1000
const GUILD_SAVED_CMD_CACHE_SWEEP_INTERVAL_MS = 30 * 1000

const _guildSavedCmdCache = new Map()   // guildId -> { name, userId }[]
const _guildSavedCmdCacheTs = new Map() // guildId -> timestamp

const _sweepGuildSavedCmdCache = () => {
  const now = Date.now()
  for (const [id, ts] of _guildSavedCmdCacheTs) {
    if (now - ts > GUILD_SAVED_CMD_CACHE_TTL_MS) {
      _guildSavedCmdCache.delete(id)
      _guildSavedCmdCacheTs.delete(id)
    }
  }
}

setInterval(_sweepGuildSavedCmdCache, GUILD_SAVED_CMD_CACHE_SWEEP_INTERVAL_MS)

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

  // Provide a REST-only client stub (no gateway)
  get client () {
    return _getRestClient()
  },
  set client (val) {
    // Allow setting for backward compatibility, but prefer REST stub
    _restClient = val
  },
  deckTypesCache: {},
  isReady: true, // Always ready in HTTP mode

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

  // --- Guild-saved-command-names cache helpers ---
  getGuildSavedCmdNamesCache (guildId) {
    if (!_guildSavedCmdCache.has(guildId)) return null
    const ts = _guildSavedCmdCacheTs.get(guildId)
    if (Date.now() - ts > GUILD_SAVED_CMD_CACHE_TTL_MS) {
      _guildSavedCmdCache.delete(guildId)
      _guildSavedCmdCacheTs.delete(guildId)
      return null
    }
    return _guildSavedCmdCache.get(guildId)
  },
  setGuildSavedCmdNamesCache (guildId, entries) {
    if (_guildSavedCmdCache.size >= GUILD_SAVED_CMD_CACHE_MAX_SIZE) {
      const oldestId = _guildSavedCmdCacheTs.keys().next().value
      _guildSavedCmdCache.delete(oldestId)
      _guildSavedCmdCacheTs.delete(oldestId)
    }
    _guildSavedCmdCache.set(guildId, entries)
    _guildSavedCmdCacheTs.set(guildId, Date.now())
  },
  invalidateGuildSavedCmdNamesCache (guildId) {
    _guildSavedCmdCache.delete(guildId)
    _guildSavedCmdCacheTs.delete(guildId)
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
    // In HTTP mode, fetch via REST API
    try {
      const rest = _getRestClient().rest
      return await rest.get(Routes.channel(id))
    } catch (err) {
      logger.error(`Failed to fetch channel ${id} via REST`, err)
      return null
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

  // readyBasics is no longer needed in HTTP mode — kept as no-op for compatibility
  async readyBasics (slashCommands) {
    logger.log('readyBasics called — HTTP mode, no gateway connection needed')
  }
}