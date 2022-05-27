const { fetchMessageByIdAndChannelId, fetchChannelById } = require('./commonBroadcasts')
const splitMessage = require('./splitMessage')
const Discord = require('discord.js')
const Client = require('./client')
const sendDM = require('./sendDM')
const nws = require('./nws')

const _replyOrSend = async (text, message, { shouldSuppressEmbeds, shouldReply }) => {
  // Just to be safe...
  if (!message.reply || (typeof message.reply !== 'function')) {
    message = await fetchMessageByIdAndChannelId(message.channelId, message.id)
  }
  if (!message) {
    throw 'Message not found'
  }

  // Again, just to be safe...
  let channel = message.channel
  if (!channel || !channel.send || (typeof channel.send !== 'function')) {
    channel = await fetchChannelById(message.channelId)
  }
  if (!channel) {
    throw 'Channel not found'
  }
  if (!channel.isText()) {
    throw 'Attempted to _replyOrSend to a message in a non-text channel'
  }

  if (message.channel && message.guild) { // Do we even have a permission to reply?
    const me = await message.guild.members.fetch(Client.client.user.id)
    if (!message.channel.permissionsFor(me).has('SEND_MESSAGES')) {
      await sendDM(nws`Hi! I've tried to respond to your command on channel ${channel.name} \
        of guild ${channel.guild.name}, but it seems that I am missing the "Send Messages" permission for it. \
        Please contact the administrator of that guild so that they can add this permission.`, message)
      return null
    }
  }

  // Let's split the message if necessary
  const parts = splitMessage(text)
  const messages = []
  let isFirst = true
  for (const part of parts) {
    const flags = new Discord.MessageFlags()
    if (shouldSuppressEmbeds) {
      flags.add(Discord.MessageFlags.FLAGS.SUPPRESS_EMBEDS)
    }
    if (isFirst && shouldReply) {
      const response = await message.reply({ content: part, flags, failIfNotExists: false }).catch(err => { throw err })
      messages.push(response)
      isFirst = false
    } else {
      const response = await channel.send({ content: part, flags }).catch(err => { throw err })
      messages.push(response)
    }
  }
  return messages
}

module.exports = async (text, message, shouldSuppressEmbeds) => {
  if (!text) {
    throw `No text in _replyOrSend function call`
  }
  if (!message) {
    throw `No message in _replyOrSend function call for text "${text}"`
  }
  if (!message.id) {
    throw `Malformed message (no id) in _replyOrSend function call for text "${text}"`
  }
  if (!message.channelId) {
    throw `Malformed message (no channelId) in _replyOrSend function call for text "${text}"`
  }

  let shouldReply
  try {
    shouldReply = await require('./shouldReply')(message)
  } catch (error) {
    throw `Failed the shouldReply check in replyOrSend:\n${error}`
  }
  try {
    let messages
    messages = await _replyOrSend(text, message, { shouldSuppressEmbeds, shouldReply })
    if (messages && messages.length) {
      return messages[messages.length - 1]
    } else {
      return null
    }
  } catch (error) {
    throw `Failed to send a message in replyOrSend function call:\n${error}`
  }
}