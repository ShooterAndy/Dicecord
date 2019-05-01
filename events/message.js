const fs = require('fs');
let commands = {};

fs.readdir('./commands/', (err, files) => {
    files.forEach(file => {
        const commandHandler = require(`../commands/${file}`);
        const commandName = file.split('.')[0];

        commands[commandName] = commandHandler;
    });
});

module.exports = (client, message) => {
    if (message.content.startsWith('!')) {
        const commandName = message.content.split(' ')[0].slice(1);
        if(commandName && commandName.length && commands[commandName.toLowerCase()]) {
            const commandText = message.content.slice(commandName.length + 1).trim();
            return commands[commandName.toLowerCase()]({ message: message, commandText: commandText, client: client });
        }
        else {
            return message.reply('Command "' + commandName + '" not found.');
        }
    }
};