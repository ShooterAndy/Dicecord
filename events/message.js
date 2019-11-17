const defaultPrefix = '!';

module.exports = (client, message, commands, prefixes) => {
    if(!message.author) { // What in the hell?
        console.error('-- > Message "' + message.content + '" doesn\'t seem to have an author.');
        return;
    }
    if(message.author.bot) { // Do not reply to bots
        return;
    }
    if(message.author.id === '393096318123245578') { // Do not reply to assholes
        return;
    }

    let prefix = defaultPrefix;
    if(message.guild) {
        if(prefixes[message.guild.id]) {
            prefix = prefixes[message.guild.id];
        }
    }
    if (message.content.startsWith(prefix)) {
        let hasPermissions = true;
        if(message.channel && message.guild) { // Do we even have a permission to reply?
            if(!message.channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) {
                hasPermissions = false;
            }
        }
        const commandName = message.content.split(' ')[0].slice(prefix.length);
        if(commandName && commandName.length && commands[commandName.toLowerCase()]) {
            if(!hasPermissions) {
                console.error('-- > Don\'t have permission to reply to message "' + message.content +
                    '"\n by user ' + message.author.username + '#' + message.author.tag + '(' + message.author.id +
                    ')\n at the guild "' + message.guild.name + '" (' + message.guild.id + ')\n on channel #' +
                    message.channel.name + ' (' + message.channel.id + ')');
                return;
            }
            const commandText = message.content.slice(commandName.length + prefix.length).trim();
            return commands[commandName.toLowerCase()]({
                message: message,
                commandText: commandText,
                client: client,
                prefix: prefix
            });
        }
        else {
            if(hasPermissions && !(message.guild && message.guild.id === '264445053596991498' /* Bot List channel */)) {
                return message.reply('Command "' + commandName + '" not found.').catch(console.error);
            }
        }
    }
};