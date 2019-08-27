require('dotenv').config();
const fs = require('fs');
const Prefixes = require('./helpers/prefixes');

const Discord = require('discord.js');
const client = new Discord.Client();
let commands = {};
let prefixes = {};

const pgHandler = require('./helpers/pgHandler');
pgHandler.init();

fs.readdir('./commands/', (err, files) => {
    files.forEach(file => {
        const commandHandler = require(`./commands/${file}`);
        const commandName = file.split('.')[0];

        commands[commandName] = commandHandler;
    });
});

Prefixes.load().then((data) => {
    prefixes = data;

    fs.readdir('./events/', (err, files) => {
        files.forEach(file => {
            const eventHandler = require(`./events/${file}`);
            const eventName = file.split('.')[0];
            client.on(eventName, arg => eventHandler(client, arg, commands, prefixes));
        });

        client.login(process.env.BOT_TOKEN);
    });
}, (error) => {
    console.error('Couldn\'t read the prefixes file: ' + error);
});