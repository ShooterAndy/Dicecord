const fs = require('fs')
const client = require('./helpers/client')
const { Collection } = require('discord.js')

let slashCommands = new Collection()
let modals = new Collection()

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

client.readyBasics(slashCommands, modals)