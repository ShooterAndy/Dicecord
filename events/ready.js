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

module.exports = async (client) => {
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
    setInterval(async () => {
        try {
            await dbl.postStats(
              client.guilds.cache.size,
              client.shard ? client.shard.id : null,
              client.shard ? client.shard.count : null
            )
        } catch (error) {
            console.error('-- > ERROR: Failed to send DBL stats')
        }

        const used = process.memoryUsage();
        let text = '-- > MEMORY USAGE: '
        Object.keys(used).forEach(key => {
            text += `${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB; `
        })
        console.log(text)

        const result = await pg.deleteAny(SAVED_ROLL_COMMANDS_DB_NAME, nws`WHERE \
            ${SAVED_ROLL_COMMANDS_COLUMNS.timestamp} < NOW() - INTERVAL \
            '${SAVED_ROLL_COMMANDS_EXPIRE_AFTER}'`)
        if (result && result.length) {
            console.log(nws`-- > Deleted ${result.length} saved roll commands older than \
                ${SAVED_ROLL_COMMANDS_EXPIRE_AFTER}.`)
        }
    }, 1800000);
};