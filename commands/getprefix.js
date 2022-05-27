const Prefixes = require('../helpers/prefixes')
const replyOrSend = require('../helpers/replyOrSend')
const nws = require('../helpers/nws')
const {
  ERROR_PREFIX
} = require('../helpers/constants')
const logger = require('../helpers/logger')

module.exports = async args => {
  const message = args.message
  const client = args.client
  const guildId = args.commandText.trim()
  if(message.author.id) {
    try {
      const application = client.fetchApplication()
      if(message.author.id !== application.owner.id) {
        logger.warn(nws`User ${message.author.username}#${message.author.tag}( \
          ${message.author.id}) attempted to use a getPrefix command!`)
        return await replyOrSend(`${ERROR_PREFIX}You cannot use this command.`, message)
      }
      if(!guildId) {
        return await replyOrSend(`${ERROR_PREFIX}No Guild id specified.`, message)
      }
      if(!client.guilds.cache.get(guildId)) {
        return await replyOrSend(`${ERROR_PREFIX}This bot is not present at this Guild.`, message)
      }
      const prefix = Prefixes.prefixes[guildId] ?
        (`\`${Prefixes.prefixes[guildId]}\``) : 'not specified'
      return await replyOrSend(nws`Prefix for Guild "${client.guilds.cache.get(guildId).name}" \`${guildId}\` \
        is ${prefix}.`, message)
    } catch (error) {
      logger.error(`Failed to fetch application`, error)
    }
  }
};