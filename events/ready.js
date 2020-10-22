const packageJSON = require('../package.json');

const tryToSetActivity = async (client) => {
    try {
        await client.user.setActivity('v' + packageJSON.version + ', type !help')
        console.log('-- > Successfully set activity')
    } catch (error) {
        await tryToSetActivity(client)
    }
}

module.exports = client => {
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
        try {
            dbl.postStats(client.guilds.cache.size, client.shard ? client.shard.id : null,
              client.shard ? client.shard.count : null)
        } catch (error) {
            console.error('-- > ERROR: Failed to send DBL stats')
        }
    }, 1800000);
};