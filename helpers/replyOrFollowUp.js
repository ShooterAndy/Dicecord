const logger = require('./logger')
const nws = require('./nws')

module.exports = async (interaction, content) => {
  if (!content) {
    logger.error(`No content in replyOrFollowUp`)
  }
  if (interaction) {
    if (interaction.isRepliable()) {
      if (!interaction.replied) {
        content.fetchReply = true
        try {
          return await interaction.editReply(content)
        } catch (e) {
          logger.error(nws`Failed to reply to an interaction in \
            replyOrFollowUp:\n${JSON.stringify(content)}`, e)
          return null
        }
      } else {
        content.fetchReply = true
        try {
          return await interaction.followUp(content)
        } catch (e) {
          logger.error(nws`Failed to follow up an interaction in \
            replyOrFollowUp:\n${JSON.stringify(content)}`, e)
          return null
        }
      }
    } else {
      logger.error(nws`Tried to reply to an interaction that is not repliable in \
          replyOrFollowUp:\n${JSON.stringify(content)}`)
      return null
    }
  } else {
    logger.error(`No interaction in replyOrFollowUp:\n${JSON.stringify(content)}`)
    return null
  }
}