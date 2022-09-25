const Discord = require('discord.js')
const splitMessage = require('./splitMessage')
const sendToChannel = require('./sendToChannel')
const handleBroadcastEval = require('./handleBroadcastEval')
const logger = require('./logger')
const nws = require('./nws')

module.exports = async (text, messageOrChannelId, shouldSuppressEmbeds) => {
  const Client = require('./client')
  if (!text) {
    throw `No text in send function call`
  }
  if (!messageOrChannelId) {
    throw `No messageOrChannelId in send function call for text "${text}"`
  }
  let message = { }
  let channelId = null
  if (typeof messageOrChannelId === 'string') {
    channelId = messageOrChannelId
  } else {
    message = messageOrChannelId
  }
  if (!channelId && !message.channelId) {
    throw `No channel id in send function call for text "${text}"`
  }
  const parts = splitMessage(text)
  const messages = []
  for (const part of parts) {
    const flags = new Discord.MessageFlags()
    if (shouldSuppressEmbeds) {
      flags.add(Discord.MessageFlags.FLAGS.SUPPRESS_EMBEDS)
    }
    if (channelId || message.guildId) {
      if (!channelId) {
        channelId = message.channelId
      }
      const pushToMessages = (response) => { if (response) messages.push(response) }
      await handleBroadcastEval(Client.client.cluster, sendToChannel, {
        context: { channelId, messageText: part, flags },
        pushToMessages
      })
    } else { // It's a DM
      let channel = message.channel
      if (!channel) {
        channel = await Client.client.channels.fetch(channelId).catch(err => {
          logger.error(nws`Failed to fetch channel ${channelId} in send`,
            err)
          return null
        })
      }
      const response = await channel.send({ content: part, flags }).catch(error => { throw error })
      messages.push(response)
    }
  }
  return messages
}