const {
  DEFAULT_PREFIX,
  ERROR_PREFIX,
  NO_NOT_FOUND_ROLE_NAME
} = require('../helpers/constants')
const replyOrSend = require('../helpers/replyOrSend')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')

module.exports = async (client, message, commands, prefixes) => {
  if (message.partial) {
    // If the message was removed the fetching might result in an API error, which we need to handle
    try {
      await message.fetch()
    } catch (error) {
      logger.error('Something went wrong when fetching a message', error)
      // Return as `reaction.message.author` may be undefined/null
      return
    }
  }
  if (!message.author) { // What in the hell?
    logger.error(`Message "${message.content}" doesn't seem to have an author???`)
    return
  }
  if (message.author.bot) { // Do not reply to bots
    return
  }

  let prefix = DEFAULT_PREFIX
  if (message.guild) {
    if (prefixes) {
      if (prefixes[message.guild.id]) {
        prefix = prefixes[message.guild.id]
      }
    }
  }
  if (message.content.startsWith(prefix)) {
    const commandName = message.content.split(' ')[0].slice(prefix.length).toLowerCase()
    if (commandName && commandName.length && commands[commandName]) {
      const commandText = message.content.slice(commandName.length + prefix.length).trim()
      const command = commands[commandName]
      if (typeof command !== 'function') {
        logger.error(`"${commandName}" is apparently not a function`)
        try {
          return await replyOrSend(nws`Something went wrong trying to process your command. Please contact the \
          bot author`, message)
        } catch (error) {
          logger.error(`Failed to send error response to "${commandName}" in "command not a function"`, error)
          return null
        }
      }
      try {
        return command({
          message: message,
          commandName: commandName,
          commandText: commandText,
          client: client,
          prefix: prefix
        })
      } catch (error) {
        logger.error(`Failed to execute "${commandName}"`, error)
        return null
      }
    }
    else {
      const sendNotFoundErrorMessage = async () => {
        if (message.channel && message.guild) { // Do we even have a permission to reply?
          const me = await message.guild.members.fetch(client.user.id)
          if(!message.channel.permissionsFor(me).has('SEND_MESSAGES')) {
            return
          }
        }
        if (!message.guild || (message.guild.id === '264445053596991498' /* Bot List guild */)) {
          try {
            return await replyOrSend(nws`${ERROR_PREFIX}Command "${commandName}" not found. You can see the list \
            of all available commands via a \`${prefix}help\` command.`, message)
          } catch (error) {
            logger.error(`Failed to send error response to "${commandName}" in sendNotFoundErrorMessage`, error)
            return null
          }
        }
      }
      if (message.guild) {
        const user = await message.guild.members.fetch(client.user)
        if (user) {
          if (!user.roles.cache.find(
            (role) => role.name === NO_NOT_FOUND_ROLE_NAME)) {
            await sendNotFoundErrorMessage()
          }
        } else {
          await sendNotFoundErrorMessage()
        }
      } else {
        await sendNotFoundErrorMessage()
      }
    }
  }
}