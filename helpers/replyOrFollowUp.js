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

// Interaction age in ms (createdTimestamp exists on both discord.js interactions and the adapter)
const _ageMs = (interaction) => interaction?.createdTimestamp
  ? Date.now() - interaction.createdTimestamp
  : null

// Timing info appended to failure logs, to tell slow acks / slow sends / slow log posting apart
const _timings = (interaction, plainTextLookupMs, sendStartAgeMs) => {
  const ackAge = interaction?._ackAgeMs != null ? `${interaction._ackAgeMs}ms` : 'n/a'
  return nws`[timings: interactionId=${interaction?.id}, ackAge=${ackAge}, \
    plainTextLookup=${plainTextLookupMs}ms, sendStartAge=${sendStartAgeMs}ms, \
    failedAtAge=${_ageMs(interaction)}ms]`
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
  const plainTextLookupStart = Date.now()
  content = await _maybeConvertToPlainText(interaction, content)
  const plainTextLookupMs = Date.now() - plainTextLookupStart
  if (interaction) {
    if (interaction.isRepliable()) {
      if (!interaction.replied) {
        content.fetchReply = true
        const sendStartAgeMs = _ageMs(interaction)
        try {
          return await retryable(
            () => interaction.editReply(content))
        } catch (e) {
          logger.error(nws`Failed to reply to an interaction in \
            replyOrFollowUp ${_timings(interaction, plainTextLookupMs, sendStartAgeMs)}:\n${_serializeForLog(content)}`, e)
          return null
        }
      } else {
        content.fetchReply = true
        const sendStartAgeMs = _ageMs(interaction)
        try {
          return await retryable(
            () => interaction.followUp(content))
        } catch (e) {
          logger.error(nws`Failed to follow up an interaction in \
            replyOrFollowUp ${_timings(interaction, plainTextLookupMs, sendStartAgeMs)}:\n${_serializeForLog(content)}`, e)
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
