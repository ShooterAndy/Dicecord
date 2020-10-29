const packageJSON = require('../package.json')
const pg = require('../helpers/pgHandler')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const {
  SAVED_ROLL_COMMANDS_DB_NAME,
  SAVED_ROLL_COMMANDS_COLUMNS,
  SAVED_ROLL_COMMANDS_EXPIRE_AFTER
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

  setInterval(() => {
    deleteExpiredSavedRollCommands()
  }, transformHoursToMs(6))
};