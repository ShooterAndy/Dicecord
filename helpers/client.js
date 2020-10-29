const Discord = require('discord.js')
const Prefixes = require('./prefixes')
const fs = require('fs')
const { LOG_PREFIX } = require('./constants')
const nws = require('./nws')
const logger = require('./logger')

const Client = module.exports = {

  client: null,

  async tryToLogIn (errorsCount, previousError, currentError) {
    if (currentError) {
      previousError = currentError
      errorsCount++
    }
    try {
    await this.client.login(process.env.BOT_TOKEN)
      if (errorsCount) {
        logger.error(nws`${LOG_PREFIX} Had ${errorsCount} errors trying to log in, the latest \
          being`, previousError)
      }
    } catch (error) {
      await this.tryToLogIn(errorsCount, previousError, error)
    }
  },

  async readyBasics (commands) {
    Client.client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'USER'] })
    let prefixes
    try {
      prefixes = await Prefixes.load()
    } catch (error) {
      logger.error(`Couldn't read the prefixes table`, error)
    }
    fs.readdir('./events/', (err, files) => {
      files.forEach(file => {
        const eventHandler = require(`../events/${file}`)
        const eventName = file.split('.')[0]
        Client.client.on(eventName, args => eventHandler(this.client, args, commands, prefixes))
      });

      logger.log('Trying to log in...')
      Client.tryToLogIn(0, null, null)
    })
  }
}