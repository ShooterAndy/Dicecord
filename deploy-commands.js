const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v9')
const dotenv = require('dotenv')
const path = require('path')
const fs = require('fs')

dotenv.config()

const commands = []
const commandsPath = path.join(__dirname, 'slashCommands')
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file)
  const command = require(filePath)
  commands.push(command.data.toJSON())
}

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN)

if (process.env.IS_LOCAL) {
  rest.get(Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID)).then(data => {
    const promises = []
    for (const command of data) {
      const deleteUrl = `${ Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID) }/${ command.id }`
      promises.push(rest.delete(deleteUrl).then(() => console.log(`Deleted ${ command.name } (local)`)))
    }
    return Promise.all(promises)
  }).then(() => {
    console.log('Successfully deleted all application commands (local).')
    rest.put(Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID),
      { body: commands }).then(() => {
      const commandNames = []
      for (const command of commands) {
        commandNames.push(command.name)
      }
      console.log(`Successfully registered application commands: "${ commandNames.join('", "') }" (local).`)
    }).catch(console.error)
  }).catch(console.error)
} else {
  rest.get(Routes.applicationCommands(process.env.APP_ID)).then(data => {
    const promises = []
    for (const command of data) {
      const deleteUrl = `${ Routes.applicationCommands(process.env.APP_ID) }/${ command.id }`
      promises.push(rest.delete(deleteUrl).then(() => console.log(`Deleted ${ command.id }`)))
    }
    return Promise.all(promises)
  }).then(() => {
    console.log('Successfully deleted all application commands.')
    rest.put(Routes.applicationCommands(process.env.APP_ID), { body: commands }).then(() => {
      const commandNames = []
      for (const command of commands) {
        commandNames.push(command.name)
      }
      console.log(`Successfully registered application commands: "${ commandNames.join('", "') }".`)
    }).catch(console.error)
  }).catch(console.error)
}