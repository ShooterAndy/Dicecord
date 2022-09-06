const pg = require('../helpers/pgHandler')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const {
  SAVED_COMMANDS_DB_NAME,
  SAVED_COMMANDS_COLUMNS,
  SAVED_COMMANDS_EXPIRE_AFTER,
  DECKS_DB_NAME,
  DECKS_COLUMNS,
  DECKS_EXPIRE_AFTER,
  USE_INTERACTIVE_REACTIONS,
  IS_LOCAL
} = require('../helpers/constants')
const Client = require('../helpers/client')
const { transformMinutesToMs, transformHoursToMs } = require('../helpers/utilities')
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

      setInterval(() => {
        deleteExpiredSavedCommands()
      }, transformHoursToMs(6))
    }
  }
}