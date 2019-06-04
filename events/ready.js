const fs = require('fs');

module.exports = client => {
    console.log('-- > Logged in as ' + client.user.tag + '!');

    const pjson = require('../package.json');
    client.user.setActivity('v' + pjson.version + ', type !help').catch(console.error);

    /*const weirdChannel = client.channels.find('id', '265156361791209475');
    if(weirdChannel) {
        console.log('Weird Channel name: "' + weirdChannel.name + '", guildId: "' + weirdChannel.guild.id +
            '", guildName:' + weirdChannel.guild.name);
    }*/

    const DBL = require('dblapi.js');
    const dbl = new DBL(process.env.DBL_TOKEN, client);
    /*fs.readdir('./dblevents/', (err, files) => {
        files.forEach(file => {
            const eventHandler = require('../dblevents/' + file);
            const eventName = file.split('.')[0];
            dbl.webhook.on(eventName, arg => eventHandler(client, arg));
        });
    });*/
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