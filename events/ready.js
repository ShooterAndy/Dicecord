const packageJSON = require('../package.json')
const pg = require('../helpers/pgHandler')
const nws = require('../helpers/nws')
const {
  SAVED_ROLL_COMMANDS_DB_NAME,
  SAVED_ROLL_COMMANDS_COLUMNS,
  SAVED_ROLL_COMMANDS_EXPIRE_AFTER
} = require('../helpers/constants')

const tryToSetActivity = async (client) => {
  try {
    await client.user.setActivity('v' + packageJSON.version + ', type !help')
    console.log('-- > Successfully set activity')
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
    const result = await pg.deleteAny(SAVED_ROLL_COMMANDS_DB_NAME, nws`WHERE \
            ${SAVED_ROLL_COMMANDS_COLUMNS.timestamp} < NOW() - INTERVAL \
            '${SAVED_ROLL_COMMANDS_EXPIRE_AFTER}'`)
    if (result && result.length) {
      console.log(nws`-- > Deleted ${result.length} saved roll commands older than \
                ${SAVED_ROLL_COMMANDS_EXPIRE_AFTER}.`)
    }
  } catch (error) {
    console.error('-- > Failed to delete expired roll commands:\n' + error)
  }
}

module.exports = (client) => {
  console.log('-- > Successfully logged in as ' + client.user.tag);

  tryToSetActivity(client)

  const DBL = require('dblapi.js');
  const dbl = new DBL(process.env.DBL_TOKEN, client);

  if(client.shard) {
    console.log('-- > Shard id: "' + client.shard.id + '"; count: "' + client.shard.count + '"');
  }
  else {
    console.log('-- > No shard');
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
        console.error('-- > ERROR: Failed to send DBL stats')
      }
    }
  }, transformMinutesToMs(30));

  deleteExpiredSavedRollCommands()

  setInterval(() => {
    deleteExpiredSavedRollCommands()
  }, transformHoursToMs(6))
};