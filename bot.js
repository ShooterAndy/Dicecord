const fs = require('fs')
const client = require('./helpers/client')
const { Collection } = require('discord.js')
const logger = require('./helpers/logger')
const pg = require('./helpers/pgHandler')

let slashCommands = new Collection()

const commandFiles = fs.readdirSync('./slashCommands').filter(file => file.endsWith('.js'))
for (const file of commandFiles) {
  const command = require(`./slashCommands/${file}`)
  slashCommands.set(command.data.name, command)
}

client.readyBasics(slashCommands)

// Graceful shutdown — clean up resources before Heroku dyno restart, etc.
const shutdown = async (signal) => {
  logger.log(`Received ${signal}, shutting down gracefully...`)
  try {
    if (client.client) {
      client.client.destroy()
    }
  } catch (err) {
    logger.error('Error destroying Discord client during shutdown', err)
  }
  try {
    pg.db.$pool.end()
  } catch (err) {
    logger.error('Error closing DB pool during shutdown', err)
  }
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

