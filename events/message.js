const {
  DEFAULT_PREFIX,
  ERROR_PREFIX,
  NO_NOT_FOUND_ROLE_NAME
} = require('../helpers/constants')
const reply = require('../helpers/reply')

module.exports = async (client, message, commands, prefixes) => {
  if(!message.author) { // What in the hell?
    console.error(`-- > Message "${message.content}" doesn't seem to have an author???`)
    return
  }
  if(message.author.bot) { // Do not reply to bots
    return
  }

  let prefix = DEFAULT_PREFIX
  if (message.guild) {
    if (prefixes[message.guild.id]) {
      prefix = prefixes[message.guild.id]
    }
  }
  if (message.content.startsWith(prefix)) {
    let hasPermissions = true
    if (message.channel && message.guild) { // Do we even have a permission to reply?
      if(!message.channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) {
        hasPermissions = false
      }
    }
    const commandName = message.content.split(' ')[0].slice(prefix.length)
    if (commandName && commandName.length && commands[commandName.toLowerCase()]) {
      if(!hasPermissions) {
        return
      }
      const commandText = message.content.slice(commandName.length + prefix.length).trim()
      return commands[commandName.toLowerCase()]({
        message: message,
        commandName: commandName,
        commandText: commandText,
        client: client,
        prefix: prefix
      })
    }
    else {
      const sendNotFoundErrorMessage = () => {
        if(hasPermissions &&
          !(
            message.guild &&
            message.guild.id === '264445053596991498' /* Bot List channel */
          )) {
          return reply(`${ERROR_PREFIX}Command "${commandName}" not found.`, message)
        }
      }
      if (message.guild) {
        try {
          const roles = await message.guild.roles.fetch()
          const dontShowNotFoundErrorRole = roles.cache.array().find(
            (role) => role.name === NO_NOT_FOUND_ROLE_NAME
          )
          if (dontShowNotFoundErrorRole) {
            const hasDontShowNotFoundErrorRole =
              !!message.guild.member(client.user).roles.cache.array().find(
                (role) => role.id === dontShowNotFoundErrorRole.id
              )
            if (!hasDontShowNotFoundErrorRole) {
              sendNotFoundErrorMessage()
            }
          }
        } catch(error) {
          console.error(`-- > ERROR: Could not fetch the list of roles:\n${error}`)
        }
      } else {
        sendNotFoundErrorMessage()
      }
    }
  }
}