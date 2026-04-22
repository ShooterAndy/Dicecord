const { Routes } = require('discord-api-types/v10')
const { MessageFlagsBitField } = require('discord.js')
const splitMessage = require('./splitMessage')
const logger = require('./logger')
const getRest = require('./rest')

module.exports = async (text, messageOrChannelId, shouldSuppressEmbeds) => {
  if (!text) {
    throw `No text in send function call`
  }
  if (!messageOrChannelId) {
    throw `No messageOrChannelId in send function call for text "${text}"`
  }
  let channelId = null
  if (typeof messageOrChannelId === 'string') {
    channelId = messageOrChannelId
  } else {
    channelId = messageOrChannelId.channelId
  }
  if (!channelId) {
    throw `No channel id in send function call for text "${text}"`
  }
  const parts = splitMessage(text)
  const messages = []
  const rest = getRest()
  for (const part of parts) {
    const body = { content: part }
    if (shouldSuppressEmbeds) {
      body.flags = MessageFlagsBitField.Flags.SuppressEmbeds
    }
    try {
      const response = await rest.post(Routes.channelMessages(channelId), { body })
      if (response) messages.push(response)
    } catch (err) {
      logger.error(`Failed to send message to channel ${channelId}`, err)
    }
  }
  return messages
}