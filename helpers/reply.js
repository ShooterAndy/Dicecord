const logger = require('./logger')

module.exports = async (text, message) => {
  if (!text || !message) {
    logger.error(`No text or message in reply function call`)
  }
  try {
    if (message.channel && message.guild) { // Do we even have a permission to reply?
      if(!message.guild.me
        || !message.channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) {
        return null
      }
    }
    const doReply = require('./shouldReply')(message)
    let messages
    if (doReply) {
      messages = await message.reply(`\n${text}`, { split: true })
    } else {
      messages = await message.channel.send(text, { split: true })
    }
    if (!message) {
      logger.error(`Empty message in reply: "${text}", doReply: ${doReply}`)
    }
    return messages[messages.length - 1]
  } catch (error) {
    logger.error(`Failed to send a message in reply function call`, error)
  }
}