const {
  MIN_PREFIX_LENGTH,
  MAX_PREFIX_LENGTH,
  ERROR_PREFIX
} = require('../helpers/constants')
const Prefixes = require('../helpers/prefixes')
const replyOrSend = require('../helpers/replyOrSend')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const Client = require('../helpers/client')

module.exports = async args => {
  if (!args.message.guild || !args.message.guild.id) {
    return await replyOrSend(`${ERROR_PREFIX}You can only change the prefix for a Discord Guild.`, args.message)
  }

  const guild = await Client.client.guilds.fetch(args.message.guild.id)
  if (!guild) {
    return await replyOrSend(`${ERROR_PREFIX}Guild not found.`,
      args.message)
  }

  const guildMember = await guild.members.fetch(args.message.author.id)
  if (!guildMember) {
    return await replyOrSend(nws`${ERROR_PREFIX}Guild Member not found.`, args.message)
  }

  if (!guildMember.permissions.has('ADMINISTRATOR')) {
    return await replyOrSend(nws`${ERROR_PREFIX}Only a guild administrator can change the prefix for this \
      Discord Guild.`, args.message)
  }

  if (!args.commandText || args.commandText.trim().length === 0) {
    return await replyOrSend(`${ERROR_PREFIX}No prefix specified. Please input something like this:\n\
      \`${args.prefix}${args.commandName}, or check out \'${args.prefix}help setPrefix\` for more info.`, args.message)
  }

  const suggestedPrefix = args.commandText.trim()
  if (suggestedPrefix.length < MIN_PREFIX_LENGTH) {
    return await replyOrSend(nws`${ERROR_PREFIX}Please provide a prefix that is longer than \
      ${MIN_PREFIX_LENGTH} symbols.`, args.message)
  }
  if (suggestedPrefix.length > MAX_PREFIX_LENGTH) {
    return await replyOrSend(nws`${ERROR_PREFIX}Please provide a prefix that is shorter than \
      ${MAX_PREFIX_LENGTH} symbols.`, args.message)
  }

  if (suggestedPrefix.match(/\s/g)) {
    return await replyOrSend(`${ERROR_PREFIX}The prefix can't have any white-space symbols in it.`, args.message)
  }

  if (suggestedPrefix.startsWith('/')) {
    return await replyOrSend(nws`${ERROR_PREFIX}the prefix can't start with the Discord-reserved symbol \`/\`.`,
      args.message)
  }

  if (suggestedPrefix.indexOf('#') !== -1 ||
    suggestedPrefix.indexOf('@') !== -1 ||
    suggestedPrefix.indexOf('*') !== -1 ||
    suggestedPrefix.indexOf('_') !== -1 ||
    suggestedPrefix.indexOf('~') !== -1 ||
    suggestedPrefix.indexOf('`') !== -1 ||
    suggestedPrefix.indexOf(':') !== -1 ||
    suggestedPrefix.indexOf('\'') !== -1 ||
    suggestedPrefix.indexOf('"') !== -1 ||
    suggestedPrefix.indexOf('||') !== -1) {
    return await replyOrSend(nws`${ERROR_PREFIX}The prefix can't have either double or single quotation marks, \
      the backtick and the Discord-reserved symbols \`@\`, \`#\`, \`*\`, \`_\`, \`~\`, \`:\`, or \`||\`.`, args.message)
  }

  try {
    await Prefixes.set(args.message.guild.id, suggestedPrefix)
    return await replyOrSend(`Prefix successfully set to \`${suggestedPrefix}\`.`, args.message)
  } catch (err) {
    logger.error(`Couldn't save the prefixes file`, err)
    return await replyOrSend(`${ERROR_PREFIX}Couldn't save the prefix. Please contact the bot author.`,
      args.message)
  }
}