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
  ROLL_RESULTS_MESSAGE_EXPIRE_AFTER
} = require('../helpers/constants')

const tryToSetActivity = async (client) => {
  try {
    await client.user.setActivity('v' + packageJSON.version + ', type !help')
    logger.log('Successfully set activity')
  } catch (error) {
    await tryToSetActivity(client)
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
    logger.error(`Failed to fetch channel for a warning`, error)
    return
  }
  let message
  try {
    message = await channel.messages.fetch(warning[MESSAGES_COLUMNS.message_id])
  } catch (error) {
    logger.error(`Failed to fetch a warning message`, error)
    return
  }

  try {
    await message.delete()
  } catch (error) {
    logger.error(`Failed to delete a warning message`, error)
  }
}

const deleteExpiredWarningMessages = async (client) => {
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
      logger.log(nws`Deleted ${result.length} warnings older than \
                ${WARNING_MESSAGE_EXPIRE_AFTER}.`)
      result.forEach(warning => {
        removeWarningInteractivity(client, warning)
      })
    }
  } catch (error) {
    logger.error(`Failed to delete expired warnings`, error)
  }
}

const deleteExpiredRollResultMessages = async (client) => {
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
      logger.log(nws`Deleted ${result.length} roll results older than \
                ${ROLL_RESULTS_MESSAGE_EXPIRE_AFTER}.`)
    }
  } catch (error) {
    logger.error(`Failed to delete expired roll results`, error)
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

  await tryToSetActivity(client)

  await deleteExpiredSavedRollCommands()
  await deleteExpiredWarningMessages(client)

  setInterval(() => {
    deleteExpiredSavedRollCommands()
  }, transformHoursToMs(6))

  setInterval(() => {
    deleteExpiredWarningMessages(client)
    deleteExpiredRollResultMessages(client)
  }, transformMinutesToMs(5))
};