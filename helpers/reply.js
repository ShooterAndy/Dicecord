module.exports = async (text, message) => {
  if (!text || !message) {
    console.error('-- > ERROR: No text or message in reply')
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
    throw error
  }
}