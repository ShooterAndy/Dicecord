const logger = require('./logger')

module.exports = async (text, originalMessage) => {
  if (!originalMessage) {
    logger.error(`No original message in sendDM`)
    return null
  }
  if (!text) {
    logger.error(`No text in sendDM`)
    return null
  }
  if (!originalMessage.author) {
    logger.error(`Original message has no author in sendDM`)
    return null
  }
  if (originalMessage.author.dmChannel) {
    try {
      return await originalMessage.author.dmChannel.send(text)
    } catch (error) {
      logger.error(`Failed to send a DM message with text ${text} to ${originalMessage.author.id} in sendDM`, error)
      return null
    }
  } else {
    let dmChannel
    try {
      dmChannel = await originalMessage.author.createDM()
    } catch (error) {
      logger.error(`Failed to create a new DM channel in sendDM`, error)
      return null
    }
    if (!dmChannel) {
      logger.error(`Failed to create a new DM channel with no error in sendDM`)
      return null
    }
    try {
      return await originalMessage.author.dmChannel.send(text)
    } catch (error) {
      logger.error(`Failed to send a DM message with text ${text} to ${originalMessage.author.id} in sendDM`, error)
      return null
    }
  }
}