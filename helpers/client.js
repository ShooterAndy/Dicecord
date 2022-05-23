const Discord = require('discord.js')
const Prefixes = require('./prefixes')
const { LOG_PREFIX, USE_PARTIALS } = require('./constants')
const nws = require('./nws')
const logger = require('./logger')

const _getEntityFromBroadcastResponse = (response) => {
  if (!response) {
    logger.error(`Empty response from broadcastEval`)
    return null
  }
  if (!response.length) {
    logger.warn(`Have not found an entity in a broadcastEval lookup`)
    return null
  }
  if (response.length !== 1) {
    logger.log(`Found multiple entities in broadcastEval lookup. Here they are:\n${JSON.stringify(response)}`)
    return null
  }
  let entity = null
  let count = 0
  while (entity === null && count < response.length) {
    if (response[count]) {
      entity = response[count]
    }
    count++
  }
  return entity
}

const _getChannelById = async (clientOrShard, { id }) => {
  if (!clientOrShard || !clientOrShard.channels) {
    throw `Missing client channels data in _getChannelById for channel ${id}`
  }
  try {
    return clientOrShard.channels.fetch(id)
  } catch (err) {
    throw err
  }
}

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

  async getChannelById (id) {
    try {
      if (this.client.shard) {
        const response =
            await this.client.shard.broadcastEval(_getChannelById, { context: { id } })
        return _getEntityFromBroadcastResponse(response)
      } else {
        return _getChannelById(this.client, { id })
      }
    } catch (err) {
      throw err
    }
  },

  async readyBasics (commands) {
    let options = {}
    if (USE_PARTIALS) {
      options = { partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'USER'] }
    }
    const myIntents = new Discord.Intents()
    myIntents.add(
      Discord.Intents.FLAGS.GUILDS,
      Discord.Intents.FLAGS.GUILD_MESSAGES,
      Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
      Discord.Intents.FLAGS.DIRECT_MESSAGES,
      Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
    )
    options.intents = myIntents
    Client.client = new Discord.Client(options)

    //This is quite a hack, but I couldn't find a better way
    Client.client.functions = {
      getChannelById: _getChannelById
    }

    let prefixes
    try {
      prefixes = await Prefixes.load()
    } catch (error) {
      logger.error(`Couldn't read the prefixes table`, error)
    }
    Client.client.on('error', async error =>
        await require(`../events/error`)(Client.client, error))
    Client.client.on('ready', async () =>
        await require(`../events/ready`)(Client.client))
    Client.client.on('messageCreate', async message =>
        await require(`../events/message`)(Client.client, message, commands, prefixes))
    Client.client.on('messageReactionAdd', async (messageReaction, user) =>
        await require('../events/messageReactionAdd')(Client.client, messageReaction, user))

    logger.log('Trying to log in...')
    await Client.tryToLogIn(0, null, null)
  }
}