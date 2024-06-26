const logger = require('./logger')
const { Message, User, Interaction, GuildMember} = require('discord.js')

module.exports = async (text, context) => {
  if (!context) {
    logger.error(`No context in sendDM`)
    return null
  }
  if (!text) {
    logger.error(`No text in sendDM`)
    return null
  }
  let dmChannel
  if (context instanceof Message) {
    if (!context.author) {
      logger.error(`Original message has no author in sendDM`)
      return null
    }
    context = context.author
  } else if (context instanceof Interaction) {
    if (!context.user) {
      logger.error(`Original interaction has no user in sendDM`)
      return null
    }
    context = context.user
  } else if (context instanceof User || context instanceof GuildMember) {
    // Everything's fine
  } else {
    logger.error(`Unknown context in sendDM: ${JSON.stringify(context)}`)
    return null
  }

  if (context.dmChannel) {
    dmChannel = context.dmChannel
  } else {
    try {
      dmChannel = await context.createDM()
    } catch (error) {
      logger.error(`Failed to create a new DM channel in sendDM`, error)
      return null
    }
    if (!dmChannel) {
      logger.error(`Failed to create a new DM channel with no error in sendDM`)
      return null
    }
  }

  try {
    return await dmChannel.send(text)
  } catch (error) {
    if (error && error.name === 'DiscordAPIError'
        && error.message === 'Cannot send messages to this user') {
      return null // Common and expected error, no need to log it
    }
    logger.error(`Failed to send a DM message with text ${text} to ${context.id} in sendDM`,
      error)
    return null
  }
}