const _ = require('underscore');

module.exports = (args) => {
    const message = args.message;
    const client = args.client;
    if(message.author.id) {
        client.fetchApplication().then(application => {
            if(message.author.id !== application.owner.id) {
                console.error('-- > User ' + message.author.username + '#' + message.author.tag + '(' +
                    message.author.id + ') attempted to get the list of servers!');
                return message.reply('ERROR: You cannot use this command.').catch(console.error);
            }
            let replyText = 'List of servers/guilds:';
            _.each(client.guilds.array(), (guild, i) => {
                replyText += '\n' + (i+1) + '. ' + guild.name + '(' + guild.id + ')';
            });
            return message.reply(replyText).catch(console.error);
        }).catch(console.error);
    }
};