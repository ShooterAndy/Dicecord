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

Prefixes.load().then((data) => {
    prefixes = data;
}, (error) => {
    console.error('Couldn\'t read the prefixes file: ' + error);
});

fs.readdir('./events/', (err, files) => {
    files.forEach(file => {
        const eventHandler = require(`./events/${file}`);
        const eventName = file.split('.')[0];
        client.on(eventName, arg => eventHandler(client, arg, commands, prefixes));
    });
});

client.login(process.env.BOT_TOKEN);