require('dotenv').config();
const fs = require('fs');
const Prefixes = require('./helpers/prefixes');

const Discord = require('discord.js');
const client = new Discord.Client();
let commands = {};
let prefixes = {};

fs.readdir('./commands/', (err, files) => {
    files.forEach(file => {
        const commandHandler = require(`./commands/${file}`);
        const commandName = file.split('.')[0];

        commands[commandName] = commandHandler;
    });
});

const tryToLogIn = function(errorsCount, previousError, currentError) {
    if (currentError) {
        previousError = currentError;
        errorsCount++;
    }
    client.login(process.env.BOT_TOKEN).then(() => {
        if (errorsCount) {
            console.error(
              `-- > Had ${errorsCount} errors trying to log in, the latest being:\n${previousError}`);
        }
    }).catch(error => {
        tryToLogIn(errorsCount, previousError, error);
    });
};

const readyBasics = async () => {
    try {
        prefixes = await Prefixes.load();
    } catch (error) {
        console.error('Couldn\'t read the prefixes table: ' + error);
    }
    fs.readdir('./events/', (err, files) => {
        files.forEach(file => {
            const eventHandler = require(`./events/${file}`);
            const eventName = file.split('.')[0];
            client.on(eventName, arg => eventHandler(client, arg, commands, prefixes));
        });

        console.info('-- > Trying to log in...');
        tryToLogIn(0, null, null);
    });
}

readyBasics();