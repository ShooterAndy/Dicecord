const Discord = require('discord.js')
const Prefixes = require('./prefixes')
const fs = require('fs')
const { LOG_PREFIX, USE_PARTIALS } = require('./constants')
const nws = require('./nws')
const logger = require('./logger')

const Client = module.exports = {

  client: null,
  reactionsCache: {},

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
    let options = {}
    if (USE_PARTIALS) {
      options = { partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'USER'] }
    }
    Client.client = new Discord.Client(options)
    let prefixes
    try {
      prefixes = await Prefixes.load()
    } catch (error) {
      logger.error(`Couldn't read the prefixes table`, error)
    }
    await fs.readdir('./events/', async (err, files) => {

      Client.client.on('error', async error =>
        await require(`../events/error`)(Client.client, error))
      Client.client.on('ready', async () =>
        await require(`../events/ready`)(Client.client))
      Client.client.on('message', async message =>
        await require(`../events/message`)(Client.client, message, commands, prefixes))
      Client.client.on('messageReactionAdd', async (messageReaction, user) =>
        await require('../events/messageReactionAdd')(Client.client, messageReaction, user))

      logger.log('Trying to log in...')
      await Client.tryToLogIn(0, null, null)
    })
  }
}