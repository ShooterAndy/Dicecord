const pg = require('../helpers/pgHandler')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const {
  SAVED_COMMANDS_DB_NAME,
  SAVED_COMMANDS_COLUMNS,
  SAVED_COMMANDS_EXPIRE_AFTER,
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
const { transformMinutesToMs, transformHoursToMs } = require('../helpers/utilities')
const handleBroadcastEval = require('../helpers/handleBroadcastEval')
const packageJSON = require('../package.json')

const tryToSetActivity = async () => {
  try {
    await Client.client.user.setActivity('v' + packageJSON.version + ', type /help')
    //await Client.client.user.setActivity('⚡️ATTN! Type /notice')
    /*logger.log('Successfully set activity')*/
  } catch (error) {
    logger.error('Failed to set activity', error)
    await tryToSetActivity(Client.client)
  }
}

const deleteExpiredSavedCommands = async () => {
  try {
    const result = await pg.db.any(
      'DELETE FROM ${db#} WHERE ${timestamp~} < NOW() - INTERVAL ${interval} RETURNING *',
      {
        db: SAVED_COMMANDS_DB_NAME,
        timestamp: SAVED_COMMANDS_COLUMNS.timestamp,
        interval: SAVED_COMMANDS_EXPIRE_AFTER
      }
    )
    if (result && result.length) {
      logger.log(nws`Deleted ${result.length} saved commands older than \
                ${SAVED_COMMANDS_EXPIRE_AFTER}.`)
    }
  } catch (error) {
    logger.error(`Failed to delete expired commands`, error)
  }
}

const deleteMessageOnChannel = async (client, { channelId, messageId }) => {
  let channel
  try {
    channel = await client.channels.fetch(channelId)
  } catch (error) {
    return `Failed to fetch channel for a warning${error && error.message ? `: ${error.message}` : ''}`
  }
  if (channel) {
    if (channel.isText()) {
      let message
      try {
        message = await channel.messages.fetch(messageId)
      } catch (error) {
        return `Failed to fetch a warning message${error && error.message ? `: ${error.message}` : ''}`
      }
      if (message) {
        try {
          await message.delete()
          return true
        } catch (error) {
          return `Failed to delete a warning message${error && error.message ? `: ${error.message}` : ''}`
        }
      } else {
        return true // we don't care if the message doesn't exist already
      }
    } else {
      return `Attempted to delete a message from a non-text channel "${channelId}"`
    }
  } else {
    return true // we don't care if the channel doesn't exist
  }
}

const removeWarningInteractivity = async (warning) => {
  await handleBroadcastEval(Client.client.cluster, deleteMessageOnChannel, {
    context: {
      channelId: warning[MESSAGES_COLUMNS.channel_id],
      messageId: warning[MESSAGES_COLUMNS.message_id]
    }
  })
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
        Client.reactionsCache[channelId + '_' + messageId] = null
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
      await deleteExpiredSavedCommands()
      await deleteExpiredWarningMessages()

      setInterval(() => {
        deleteExpiredSavedCommands()
      }, transformHoursToMs(6))

      setInterval(() => {
        deleteExpiredWarningMessages()
        deleteExpiredRollResultMessages()
      }, transformMinutesToMs(5))
    }
  }
}