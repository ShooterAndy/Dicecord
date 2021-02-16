const pg = require('../helpers/pgHandler')
const logger = require('../helpers/logger')
const {
  MESSAGES_DB_NAME,
  MESSAGES_COLUMNS,
  MESSAGE_TYPES,
  YES_EMOJI,
  NO_EMOJI,
  B_EMOJI,
  M_EMOJI,
  REPEAT_EMOJI,
  THROW_RESULTS_FORMATS,
  USE_PARTIALS
} = require('../helpers/constants')
const roll = require('../commands/roll')
const reply = require('../helpers/reply')
const nws = require('../helpers/nws')
const Client = require('../helpers/client')
const formatThrowResults = require('../helpers/formatThrowResults')

module.exports = async (client, reaction, user) => {
  if (!reaction || !reaction.emoji || !user) { // ...what?
    return
  }

  if (!user.partial) { // handle partial stuff
    if (!user.id || user.id === client.user.id) { // if it's the bot reacting, ignore it
      return
    }
  }

  if (reaction.partial) { // handle partial stuff
    try {
      await reaction.fetch()
    } catch (error) {
      return logger.error('Something went wrong when fetching the message for a reaction', error)
    }
  }

  if (reaction.message.author.id !== client.user.id) {
    return // if the reaction is to a message not left by the bot, ignore it
  }

  let result = Client.reactionsCache[reaction.message.channel.id + '_' + reaction.message.id]
  if (result === null) { // Already deleted, don't try again
    return
  } else if (result === undefined) { // Not cached yet
    try {
      result = await pg.db.oneOrNone(
        'SELECT ${type~}, ${content~} FROM ${db#} WHERE ${messageId~} = ${messageIdValue} ' +
        'AND ${channelId~} = ${channelIdValue} ', {
          db: pg.addPrefix(MESSAGES_DB_NAME),
          type: MESSAGES_COLUMNS.type,
          content: MESSAGES_COLUMNS.content,
          messageId: MESSAGES_COLUMNS.message_id,
          channelId: MESSAGES_COLUMNS.channel_id,
          messageIdValue: reaction.message.id,
          channelIdValue: reaction.message.channel.id
        })
    } catch (error) {
      logger.error(`Failed to get a reacted-to message from DB`, error)
    }
    Client.reactionsCache[reaction.message.channel.id + '_' + reaction.message.id] = result
  }
  if (!result) {
    return
  }

  await processReaction(reaction, result)
}

const processReaction = async (reaction, result) => {
  let content
  let originalMessage

  if (!result[MESSAGES_COLUMNS.content]) {
    return logger.error(`Empty reaction content, result:\n${JSON.stringify(result)}`)
  }
  const contentString = result[MESSAGES_COLUMNS.content]
  if (!contentString) {
    return logger.error(`Reaction content string empty, result:\n${JSON.stringify(result)}`)
  }

  try {
    content = JSON.parse(contentString)
  } catch (error) {
    return logger.error(`Failed to parse a reaction content, contentString:\n${contentString}`,
      error)
  }
  const messageId = content.messageId
  if (!messageId) {
    return logger.error(`No message id in reaction content, contentString:\n${contentString}`)
  }

  try {
    originalMessage = await reaction.message.channel.messages.fetch(messageId)
  } catch (error) {
    return logger.error(`Failed to find original message for reaction (messageId: ${messageId})`,
      error)
  }
  if (!originalMessage) {
    return logger.error(`Couldn't find original message for reaction (messageId: ${messageId})`)
  }
  if (!content.throws || !content.throws.length) {
    return logger.error(`Content throws empty in a reaction (messageId: ${messageId})`)
  }
  if (!content.prefix) {
    return logger.error(`Content prefix empty in a reaction (messageId: ${messageId})`)
  }
  if (!content.commandName) {
    return logger.error(`Content command name empty in a reaction (messageId: ${messageId})`)
  }

  switch (result[MESSAGES_COLUMNS.type]) {
    case MESSAGE_TYPES.warning: {
      return Promise.all([
        deleteDiscordMessage(reaction.message),
        deleteDbMessage(reaction.message),
        processWarningReaction(reaction, content, originalMessage)
      ])
    }
    case MESSAGE_TYPES.rollResult: {
      return processRollResultReaction(reaction, content, originalMessage)
    }
  }
}

const deleteDiscordMessage = async message => {
  try {
    await message.delete()
    delete Client.reactionsCache[message.channel.id + '_' + message.id]
  } catch (error) {
    logger.error(`Failed to delete a reacted-to message from Discord `, error)
  }
}

const deleteDbMessage = async message => {
  try {
    await pg.db.none(
      'DELETE FROM ${db#} WHERE ${messageId~} = ${messageIdValue} ' +
      'AND ${channelId~} = ${channelIdValue}', {
        db: pg.addPrefix(MESSAGES_DB_NAME),
        type: MESSAGES_COLUMNS.type,
        content: MESSAGES_COLUMNS.content,
        messageId: MESSAGES_COLUMNS.message_id,
        channelId: MESSAGES_COLUMNS.channel_id,
        messageIdValue: message.id,
        channelIdValue: message.channel.id
      })
  } catch (error) {
    logger.error(`Failed to delete a reacted-to message from DB`, error)
  }
}

const processRollResultReaction = async (reaction, content, originalMessage) => {
  if (reaction.emoji.name === B_EMOJI) {
    const text = formatThrowResults({
      throws: content.throws, formatName: THROW_RESULTS_FORMATS.bbcode.name
    })
    return reply(nws`Here are your results formatted for BB-code:\
      \`\`\`${text}\`\`\``, originalMessage)
  }
  if (reaction.emoji.name === M_EMOJI) {
    const text = formatThrowResults({
      throws: content.throws, formatName: THROW_RESULTS_FORMATS.markdown.name
    })
    return reply(nws`Here are your results formatted for markdown:\
      \`\`\`${text}\`\`\``, originalMessage)
  }
  if (reaction.emoji.name === REPEAT_EMOJI) {
    const args = {
      message: originalMessage,
      client: Client.client,
      prefix: content.prefix,
      commandName: content.commandName,
      throws: content.throws
    }
    return roll.repeatRollCommand(args)
  }
}

const processWarningReaction = async (reaction, content, originalMessage) => {
  if (reaction.emoji.name === YES_EMOJI) {
    const args = {
      message: originalMessage,
      client: Client.client,
      prefix: content.prefix,
      commandName: content.commandName,
      throws: content.throws
    }
    return roll.goOnFromWarning(args)
  }
  if (reaction.emoji.name === NO_EMOJI) {
    return reply(nws`Here's your original message, please copy and edit it as needed:\
      \`\`\`${originalMessage.content}\`\`\``, originalMessage)
  }
}