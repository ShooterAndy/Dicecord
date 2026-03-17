const logger = require('./logger')
const nws = require('./nws')
const retryable = require('./retryableDiscordRequest')
const truncate = require('./truncate')

const _serializeForLog = (content) => {
  try {
    return truncate(JSON.stringify(content), 500, '… (truncated)')
  } catch {
    return '(failed to serialize content)'
  }
}

module.exports = async (interaction, content) => {
  if (!content) {
    logger.error(`No content in replyOrFollowUp`)
  }
  if (interaction) {
    if (interaction.isRepliable()) {
      if (!interaction.replied) {
        content.fetchReply = true
        try {
          return await retryable(
            () => interaction.editReply(content))
        } catch (e) {
          logger.error(nws`Failed to reply to an interaction in \
            replyOrFollowUp:\n${_serializeForLog(content)}`, e)
          return null
        }
      } else {
        content.fetchReply = true
        try {
          return await retryable(
            () => interaction.followUp(content))
        } catch (e) {
          logger.error(nws`Failed to follow up an interaction in \
            replyOrFollowUp:\n${_serializeForLog(content)}`, e)
          return null
        }
      }
    } else {
      logger.error(nws`Tried to reply to an interaction that is not repliable in \
          replyOrFollowUp:\n${_serializeForLog(content)}`)
      return null
    }
  } else {
    logger.error(`No interaction in replyOrFollowUp:\n${_serializeForLog(content)}`)
    return null
  }
}