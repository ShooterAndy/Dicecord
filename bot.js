const fs = require('fs')
const client = require('./helpers/client')
const { Collection } = require('discord.js')

let commands = {}
let slashCommands = new Collection()
let modals = new Collection()

fs.readdir('./commands/', (err, files) => {
  files.forEach(file => {
    const commandHandler = require(`./commands/${file}`)
    const commandName = file.split('.')[0]

    commands[commandName] = commandHandler
  })
})

const commandFiles = fs.readdirSync('./slashCommands').filter(file => file.endsWith('.js'))
for (const file of commandFiles) {
  const command = require(`./slashCommands/${file}`)
  slashCommands.set(command.data.name, command)
}

const modalFiles = fs.readdirSync('./modals').filter(file => file.endsWith('.js'))
for (const file of modalFiles) {
  const modalFile = require(`./modals/${file}`)
  modals.set(modalFile.modal.customId, modalFile)
}

client.readyBasics(commands, slashCommands, modals)