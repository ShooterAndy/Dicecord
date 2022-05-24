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
    //await Client.client.user.setActivity('⚡️ATTN! Please, type !notice')
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

const removeWarningInteractivity = async (warning) => {
  // TODO: I need to move it all into broadcastEval, it seems
  let channel
  try {
    channel = await Client.getChannelById(warning[MESSAGES_COLUMNS.channel_id])
  } catch (error) {
    if (error && error.name === 'DiscordAPIError') {
      logger.warn(`Failed to fetch channel for a warning`, error)
    } else {
      logger.error(`Failed to fetch channel for a warning`, error)
    }
    return
  }
  if (!channel) {
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
  if (!message) {
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
        removeWarningInteractivity(warning)
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

  if(client.cluster) {
    logger.log(`Launched a new cluster id: "${client.cluster.id}"; total cluster count: "${client.cluster.count}"`)
  }
  else {
    logger.log(`No clustering`)
  }

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
}