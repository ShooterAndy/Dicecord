const send = require('./send')
const reply = require('./reply')

module.exports = async (text, message, shouldSuppressEmbeds) => {
  if (!text) {
    throw `No text in replyOrSend function call`
  }
  if (!message) {
    throw `No message in replyOrSend function call for text "${text}"`
  }
  try {
    if (message.channel && message.guild) { // Do we even have a permission to reply?
      if(!message.guild.me
        || !message.channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) {
        return null
      }
    }
    const doReply = await require('./shouldReply')(message)
    let messages
    if (doReply) {
      messages = await reply(text, message, shouldSuppressEmbeds)
    } else {
      messages = await send(text, message, shouldSuppressEmbeds)
    }
    return messages[messages.length - 1]
  } catch (error) {
    throw `Failed to send a message in reply function call:\n${error}`
  }
}