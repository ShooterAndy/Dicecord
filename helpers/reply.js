const logger = require('./logger')

module.exports = async (text, message) => {
  if (!text || !message) {
    logger.error(`No text or message in reply function call`)
  }
  try {
    const doReply = require('./shouldReply')()
    let messages
    if (doReply) {
      messages = await message.reply(`\n${text}`, {split: true})
    } else {
      messages = message.channel.send(text, {split: true})
    }
    return messages[messages.length - 1]
  } catch (error) {
    logger.error(`Failed to send a message in reply function call`, error)
  }
}