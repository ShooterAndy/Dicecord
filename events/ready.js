const packageJSON = require('../package.json')
const pg = require('../helpers/pgHandler')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const {
  SAVED_ROLL_COMMANDS_DB_NAME,
  SAVED_ROLL_COMMANDS_COLUMNS,
  SAVED_ROLL_COMMANDS_EXPIRE_AFTER,
  MESSAGES_DB_NAME,
  MESSAGES_COLUMNS,
  MESSAGE_TYPES,
  WARNING_MESSAGE_EXPIRE_AFTER,
  ROLL_RESULTS_MESSAGE_EXPIRE_AFTER,
  DECKS_DB_NAME,
  DECKS_COLUMNS,
  DECKS_EXPIRE_AFTER,
  USE_INTERACTIVE_REACTIONS,
  IS_LOCAL
} = require('../helpers/constants')
const Client = require('../helpers/client')

const tryToSetActivity = async () => {
  try {
    await Client.client.user.setActivity('v' + packageJSON.version + ', type !help')
    /*logger.log('Successfully set activity')*/
  } catch (error) {
    logger.error('Failed to set activity', error)
    await tryToSetActivity(Client.client)
  }
}

const transformMinutesToMs = (minutes) => {
  return minutes * 60 * 1000
}

const transformHoursToMs = (hours) => {
  return hours * 60 * 60 * 1000
}

const deleteExpiredSavedRollCommands = async () => {
  try {
    const result = await pg.db.any(
      'DELETE FROM ${db#} WHERE ${timestamp~} < NOW() - INTERVAL ${interval} RETURNING *',
      {
        db: SAVED_ROLL_COMMANDS_DB_NAME,
        timestamp: SAVED_ROLL_COMMANDS_COLUMNS.timestamp,
        interval: SAVED_ROLL_COMMANDS_EXPIRE_AFTER
      }
    )
    if (result && result.length) {
      logger.log(nws`Deleted ${result.length} saved roll commands older than \
                ${SAVED_ROLL_COMMANDS_EXPIRE_AFTER}.`)
    }
  } catch (error) {
    logger.error(`Failed to delete expired roll commands`, error)
  }
}

const removeWarningInteractivity = async (client, warning) => {
  let channel
  try {
    channel = await client.channels.fetch(warning[MESSAGES_COLUMNS.channel_id])
  } catch (error) {
    if (error && error.name === 'DiscordAPIError') {
      logger.warn(`Failed to fetch channel for a warning`, error)
    } else {
      logger.error(`Failed to fetch channel for a warning`, error)
    }
    return
  }
  let message
  try {
    message = await channel.messages.fetch(warning[MESSAGES_COLUMNS.message_id])
  } catch (error) {
    if (error && error.name === 'DiscordAPIError') {
      logger.warn(`Failed to fetch a warning message`, error)
    } else {
      logger.error(`Failed to fetch a warning message`, error)
    }
    return
  }

  try {
    await message.delete()
  } catch (error) {
    if (error && error.name === 'DiscordAPIError') {
      logger.warn(`Failed to delete a warning message`, error)
    } else {
      logger.error(`Failed to delete a warning message`, error)
    }
  }
}

const deleteExpiredWarningMessages = async () => {
  try {
    const result = await pg.db.any(
      'DELETE FROM ${db#} ' +
      'WHERE ${timestamp~} < NOW() - INTERVAL ${interval} AND ${type~} = ${typeValue} RETURNING *',
      {
        db: MESSAGES_DB_NAME,
        type: MESSAGES_COLUMNS.type,
        typeValue: MESSAGE_TYPES.warning,
        timestamp: MESSAGES_COLUMNS.timestamp,
        interval: WARNING_MESSAGE_EXPIRE_AFTER
      }
    )
    if (result && result.length) {
      /*logger.log(nws`Deleted ${result.length} warnings older than \
                ${WARNING_MESSAGE_EXPIRE_AFTER}.`)*/
      result.forEach(warning => {
        const channelId = warning[MESSAGES_COLUMNS.channel_id]
        const messageId = warning[MESSAGES_COLUMNS.message_id]
        Client.reactionsCache[channelId+ '_' + messageId] = null
        removeWarningInteractivity(Client.client, warning)
      })
    }
  } catch (error) {
    logger.error(`Failed to delete expired warnings`, error)
  }
}

const deleteExpiredRollResultMessages = async () => {
  try {
    const result = await pg.db.any(
      'DELETE FROM ${db#} ' +
      'WHERE ${timestamp~} < NOW() - INTERVAL ${interval} AND ${type~} = ${typeValue} RETURNING *',
      {
        db: MESSAGES_DB_NAME,
        type: MESSAGES_COLUMNS.type,
        typeValue: MESSAGE_TYPES.rollResult,
        timestamp: MESSAGES_COLUMNS.timestamp,
        interval: ROLL_RESULTS_MESSAGE_EXPIRE_AFTER
      }
    )
    if (result && result.length) {
      /*logger.log(nws`Deleted ${result.length} roll results older than \
                ${ROLL_RESULTS_MESSAGE_EXPIRE_AFTER}.`)*/
      result.forEach(rollResult => {
        const channelId = rollResult[MESSAGES_COLUMNS.channel_id]
        const messageId = rollResult[MESSAGES_COLUMNS.message_id]
        Client.reactionsCache[channelId+ '_' + messageId] = null
      })
    }
  } catch (error) {
    logger.error(`Failed to delete expired roll results`, error)
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
      }
    )
    if (result && result.length) {
      /*logger.log(nws`Deleted ${result.length} decks older than \
                ${ROLL_RESULTS_MESSAGE_EXPIRE_AFTER}.`)*/
    }
  } catch (error) {
    logger.error(`Failed to delete expired decks`, error)
  }
}

module.exports = async (client) => {
  logger.log(`Successfully logged in as ${client.user.tag}`)

  const DBL = require('dblapi.js')
  const dbl = new DBL(process.env.DBL_TOKEN, client)

  if(client.shard) {
    logger.log(`Shard id: "${client.shard.id}"; count: "${client.shard.count}"`)
  }
  else {
    logger.log(`No shard`)
  }
  setInterval(() => {
    if (!process.env.IS_LOCAL) {
      try {
        dbl.postStats(
          client.guilds.cache.size,
          client.shard ? client.shard.id : null,
          client.shard ? client.shard.count : null
        )
      } catch (error) {
        logger.error(`Failed to send DBL stats`, error)
      }
    }
  }, transformMinutesToMs(30))

  await tryToSetActivity()
  setInterval(async () => {
    await tryToSetActivity()
  }, transformMinutesToMs(15))

  if (!IS_LOCAL) {
    await deleteExpiredDecks()
    setInterval(async () => {
      await deleteExpiredDecks()
    }, transformHoursToMs(6))

    if (USE_INTERACTIVE_REACTIONS) {
      await deleteExpiredSavedRollCommands()
      await deleteExpiredWarningMessages()

      setInterval(() => {
        deleteExpiredSavedRollCommands()
      }, transformHoursToMs(6))

      setInterval(() => {
        deleteExpiredWarningMessages()
        deleteExpiredRollResultMessages()
      }, transformMinutesToMs(5))
    }
  }
};