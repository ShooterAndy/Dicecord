const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v10')
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

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN)

// PUT bulk overwrite is atomic — no need to delete first
const route = process.env.IS_LOCAL
  ? Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID)
  : Routes.applicationCommands(process.env.APP_ID)

rest.put(route, { body: commands }).then(() => {
  const commandNames = commands.map(c => c.name)
  const suffix = process.env.IS_LOCAL ? ' (local)' : ''
  console.log(`Successfully registered application commands${suffix}: "${commandNames.join('", "')}".`)
}).catch(console.error)
