const logger = require('./logger')
const nws = require('./nws')
const retryable = require('./retryableDiscordRequest')
const truncate = require('./truncate')
const embedToPlainText = require('./embedToPlainText')

const _serializeForLog = (content) => {
  try {
    return truncate(JSON.stringify(content), 500, '… (truncated)')
  } catch {
    return '(failed to serialize content)'
  }
}

const _maybeConvertToPlainText = async (interaction, content) => {
  if (!content || !content.embeds || !content.embeds.length) return content
  if (!interaction || !interaction.guildId) return content
  try {
    const Client = require('./client')
    const plainText = await Client.getPlainTextMode(interaction.guildId)
    if (plainText) {
      return embedToPlainText(content)
    }
  } catch {
    // On failure, fall through to embed mode
  }
  return content
}

module.exports = async (interaction, content) => {
  if (!content) {
    logger.error(`No content in replyOrFollowUp`)
  }
  content = await _maybeConvertToPlainText(interaction, content)
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