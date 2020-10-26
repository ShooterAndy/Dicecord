require('dotenv').config()
const fs = require('fs')
const client = require('./helpers/client')

let commands = {}

fs.readdir('./commands/', (err, files) => {
  files.forEach(file => {
    const commandHandler = require(`./commands/${file}`)
    const commandName = file.split('.')[0]

    commands[commandName] = commandHandler
  });
});

client.readyBasics(commands)