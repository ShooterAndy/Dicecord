const logger = require('./logger')
const { Routes } = require('discord-api-types/v10')
const getRest = require('./rest')

module.exports = async (text, context) => {
  if (!context) {
    logger.error('No context in sendDM')
    return null
  }
  if (!text) {
    logger.error('No text in sendDM')
    return null
  }

  // Extract user ID from various context types
  let userId = null
  if (context.user && context.user.id) {
    userId = context.user.id
  } else if (context.id && typeof context.id === 'string') {
    userId = context.id
  } else if (context.author && context.author.id) {
    userId = context.author.id
  }

  if (!userId) {
    logger.error(`Could not determine user ID in sendDM: ${JSON.stringify(context)}`)
    return null
  }

  const rest = getRest()

  try {
    // Create DM channel via REST
    const dm = await rest.post(Routes.userChannels(), {
      body: { recipient_id: userId }
    })

    // Send message
    const body = typeof text === 'string' ? { content: text } : text
    return await rest.post(Routes.channelMessages(dm.id), { body })
  } catch (error) {
    if (error && error.code === 50007) {
      // "Cannot send messages to this user" — common and expected
      return null
    }
    logger.error(`Failed to send a DM to ${userId} in sendDM`, error)
    return null
  }
}