const fs = require('fs');
const _ = require('underscore');
let commands = {};

fs.readdir('./commands/', (err, files) => {
    files.forEach(file => {
        const commandHandler = require(`../commands/${file}`);
        const commandName = file.split('.')[0];

        commands[commandName] = commandHandler;
    });
});

module.exports = (client, message) => {
    if(!message.author) { // What in the hell?
        console.error('-- > Message "' + message.content + '" doesn\'t seem to have an author.');
        return;
    }
    if(message.author.bot) { // Do not reply to bots
        return;
    }
    if (message.content.startsWith('!')) {
        if(message.channel && message.guild) { // Do we even have a permission to reply?
            if(!message.channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) {
                console.error('-- > Don\'t have permission to reply to message "' + message.content +
                    '"\n by user ' + message.author.username + '#' + message.author.tag + '(' + message.author.id +
                    ')\n at the guild "' + message.guild.name + '" (' + message.guild.id + ')\n on channel #' +
                    message.channel.name + ' (' + message.channel.id + ')');
                return;
            }
        }
        const commandName = message.content.split(' ')[0].slice(1);
        if(commandName && commandName.length && commands[commandName.toLowerCase()]) {
            const commandText = message.content.slice(commandName.length + 1).trim();
            return commands[commandName.toLowerCase()]({ message: message, commandText: commandText, client: client });
        }
        else {
            if(message.channel.guild.id !== '264445053596991498') { // Excluding the Discord Bot List channel
                return message.reply('Command "' + commandName + '" not found.').catch(console.error);
            }
        }
    }
};