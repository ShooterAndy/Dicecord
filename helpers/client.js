const Discord = require('discord.js')
const Prefixes = require('./prefixes')
const {
  LOG_PREFIX,
  USE_PARTIALS,
  DECK_TYPES_COLUMNS,
  DECK_TYPES_DB_NAME,
  CUSTOM_DECK_TYPE
} = require('./constants')
const nws = require('./nws')
const logger = require('./logger')
const Cluster = require('discord-hybrid-sharding')
const {
  Options,
  Sweepers
} = require('discord.js')
const { transformMinutesToS } = require('./utilities')
const fs = require('fs')
const path = require('path')
const pg = require('./pgHandler')

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
  deckTypesCache: {},

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

  async cacheDeckTypes () {
    const result = await pg.db.any(
      'SELECT ${id~},${description~},${deck~} FROM ${db#} ORDER BY ${id~} ASC', {
        id: DECK_TYPES_COLUMNS.id,
        description: DECK_TYPES_COLUMNS.description,
        deck: DECK_TYPES_COLUMNS.deck,
        db: pg.addPrefix(DECK_TYPES_DB_NAME)
      })
    if (!result || !result.length) return logger.error(`The list of deck types appears to be empty`)

    result.forEach(deck => {
      this.deckTypesCache[deck.id] = { description: deck.description, deck: deck.deck }
    })
  },

  async readyBasics (commands, slashCommands, modals) {
    let options = { }
    if (USE_PARTIALS) {
      options = { partials: ['CHANNEL', 'USER'] } // USER here is *only* needed for reactions, remove later!
    }
    options.shards = Cluster.data.SHARD_LIST // An array of shards that will get spawned
    options.shardCount = Cluster.data.TOTAL_SHARDS // Total number of shards

    const myIntents = new Discord.Intents()
    myIntents.add(
      Discord.Intents.FLAGS.GUILDS,
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

    await this.cacheDeckTypes()

    Client.client.on('error', async error =>
        await require(`../events/error`)(Client.client, error))
    Client.client.on('ready', async () =>
        await require(`../events/ready`)(Client.client))

    Client.client.on('interactionCreate', async interaction => {
      if (interaction.isCommand()) {
        if (!interaction.commandName) return
        const command = slashCommands.get(interaction.commandName)
        if (!command) return
        try {
          await command.execute(interaction)
        } catch (error) {
          logger.error(`Failed while trying to execute a ${interaction.commandName} command`, error)
          await interaction.reply({
            content: `Failed to execute the \`${interaction.commandName}\` command. Please contact the bot creator.`,
            ephemeral: true
          })
        }
      } else if (interaction.isModalSubmit()) {
        if (!interaction.customId) return
        const modal = modals.get(interaction.customId)
        if (!modal) return
        try {
          await modal.processSubmission(interaction)
        } catch (error) {
          logger.error(`Failed while trying to process a ${interaction.customId} modal`, error)
          await interaction.reply({
            content: `Failed to process the \`${interaction.customId}\` modal. Please contact the bot creator.`,
            ephemeral: true
          })
        }
      } else if (interaction.isAutocomplete()) {
        // special case for /help
        if (interaction.commandName === 'help') {
          const focusedValue = interaction.options.getFocused()
          const helpPath = path.join('help')
          const helpFiles = fs.readdirSync(helpPath).filter(file => file.endsWith('.md'))
          const choices = []
          for (let file of helpFiles) {
            file = file.toLowerCase().replace('.md', '')
            if (file !== '!') {
              choices.push(file)
            }
          }
          const filtered = choices.filter(choice => choice.startsWith(focusedValue))
          await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice })),
          )
        }

        if ((interaction.commandName === 'examinedeck') ||
          (interaction.commandName === 'shuffle') ||
          (interaction.commandName === 'drawshuffled')) {
          const focusedOption = interaction.options.getFocused(true)
          const focusedValue = focusedOption.value
          const choices = []
          if (focusedOption.name === 'deck') {
            for (let deckType in this.deckTypesCache) {
              choices.push(deckType)
            }
            if (interaction.commandName !== 'examinedeck') {
              choices.push(CUSTOM_DECK_TYPE)
            }
          }
          const filtered = choices.filter(choice => choice.startsWith(focusedValue))
          await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice })),
          )
        }

        // TODO: write a generic handler with a nested object in constants
        /*if (interaction.commandName === 'help') {
          const focusedOption = interaction.options.getFocused(true)
          let choices

          if (focusedOption.name === 'name') {
            choices = ['faq', 'install', 'collection', 'promise', 'debug'];
          }

          if (focusedOption.name === 'theme') {
            choices = ['halloween', 'christmas', 'summer'];
          }

          const filtered = choices.filter(choice => choice.startsWith(focusedOption.value));
          await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice })),
          );
        }*/
      } else if (interaction.isButton()) {

        //interaction.message.id
      }
    })

    logger.log('Trying to log in...')
    await Client.tryToLogIn(0, null, null)
  }
}