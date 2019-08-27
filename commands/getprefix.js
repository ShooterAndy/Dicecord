const Prefixes = require('../helpers/prefixes');

module.exports = args => {
    const message = args.message;
    const client = args.client;
    const guildId = args.commandText.trim();
    if(message.author.id) {
        client.fetchApplication().then(application => {
            if(message.author.id !== application.owner.id) {
                console.error('-- > User ' + message.author.username + '#' + message.author.tag + '(' +
                    message.author.id + ') attempted to use a getprefix command!');
                return message.reply('**ERROR:** You cannot use this command.').catch(console.error);
            }
            if(!guildId) {
                return args.message.reply('**ERROR:** No Guild id specified.')
                    .catch(console.error);
            }
            if(!client.guilds.get(guildId)) {
                return args.message.reply('**ERROR:** This bot is not present at this Guild.')
                    .catch(console.error);
            }
            return args.message.reply('Prefix for Guild "' + client.guilds.get(guildId).name + '" `' + guildId +
                '` is' +  (Prefixes.prefixes[guildId] ? ('`' + Prefixes.prefixes[guildId] + '`') : 'not specified') +
                '.').catch(console.error);
        }).catch(console.error);
    }
};