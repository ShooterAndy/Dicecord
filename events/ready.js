module.exports = client => {
    console.log('-- > Logged in as ' + client.user.tag + '!');

    const pjson = require('../package.json');
    client.user.setActivity('v' + pjson.version + ', type !help', { type: '' }).catch(console.error);

    const DBL = require('dblapi.js');
    const dbl = new DBL(process.env.DBL_TOKEN, client);

    if(client.shard) {
        console.log('-- > Shard id: "' + client.shard.id + '"; count: "' + client.shard.count + '"');
    }
    else {
        console.log('-- > No shard');
    }
    setInterval(() => {
        dbl.postStats(client.guilds.size, client.shard ? client.shard.id : null,
            client.shard ? client.shard.count : null)
            .then(() => { }).catch(console.error);
    }, 1800000);
};