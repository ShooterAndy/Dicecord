const Discord = require('discord.js')
const Prefixes = require('./prefixes')
const { LOG_PREFIX, USE_PARTIALS } = require('./constants')
const nws = require('./nws')
const logger = require('./logger')
const Cluster = require('discord-hybrid-sharding')
const { Options, Sweepers } = require('discord.js')
const { transformHoursToS, transformMinutesToS } = require('./utilities')

const _getEntityFromBroadcastResponse = (response) => {
  if (!response) {
    logger.error(`Empty response from broadcastEval`)
    return null
  }
  if (!response.length) {
    logger.warn(`Have not found an entity in a broadcastEval lookup`)
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
      if (this.client.cluster) {
        const response =
            await this.client.cluster.broadcastEval(_getChannelById, { context: { id } })
        return _getEntityFromBroadcastResponse(response)
      } else {
        return _getChannelById(this.client, { id })
      }
    } catch (err) {
      throw err
    }
  },

  async readyBasics (commands) {
    let options = { }
    if (USE_PARTIALS) {
      options = { partials: ['CHANNEL', 'USER'] } // USER here is *only* needed for reactions, remove later!
    }
    options.shards = Cluster.data.SHARD_LIST // An array of shards that will get spawned
    options.shardCount = Cluster.data.TOTAL_SHARDS // Total number of shards

    const myIntents = new Discord.Intents()
    myIntents.add(
      Discord.Intents.FLAGS.GUILDS,
      Discord.Intents.FLAGS.GUILD_MESSAGES,
      Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
      Discord.Intents.FLAGS.DIRECT_MESSAGES,
      Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
    )
    options.intents = myIntents
    options.makeCache = Options.cacheWithLimits({
      MessageManager: {
        maxSize: 25,
        sweepInterval: transformMinutesToS(5),
        sweepFilter: Sweepers.filterByLifetime({
          lifetime: transformMinutesToS(30),
          getComparisonTimestamp: e => e.editedTimestamp ?? e.createdTimestamp,
        })
      },
      PresenceManager: 0,
      ThreadManager: 0,
      ApplicationCommandManager: 0, // guild.commands
      BaseGuildEmojiManager: 0, // guild.emojis
      GuildBanManager: 0, // guild.bans
      GuildInviteManager: 0, // guild.invites
      GuildManager: Infinity, // client.guilds
      GuildMemberManager: 0, // guild.members
      GuildStickerManager: 0, // guild.stickers
      GuildScheduledEventManager: 0, // guild.scheduledEvents
      ReactionManager: 0, // message.reactions
      ReactionUserManager: 0, // reaction.users
      StageInstanceManager: 0, // guild.stageInstances
      ThreadMemberManager: 0, // threadchannel.members
      UserManager: 0, // client.users
      VoiceStateManager: 0 // guild.voiceStates
    })
    Client.client = new Discord.Client(options)
    Client.client.cluster = new Cluster.Client(Client.client)

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