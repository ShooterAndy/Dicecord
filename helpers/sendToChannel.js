const { Routes } = require('discord-api-types/v10')
const getRest = require('./rest')

module.exports = async (client, { channelId, messageText, flags }) => {
  const logger = require('./logger')
  const rest = (client && client.rest) || getRest()
  try {
    const body = { content: messageText }
    if (flags) body.flags = typeof flags === 'object' ? flags.bitfield : flags
    return await rest.post(Routes.channelMessages(channelId), { body })
  } catch (err) {
    logger.error(`Failed to send message to channel "${channelId}" in sendToChannel`, err)
    return null
  }
}