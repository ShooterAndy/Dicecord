const logger = require('./logger')
const nws = require('./nws')

module.exports = async (interaction, content) => {
  if (!content) {
    logger.error(`No content in replyOrFollowUp`)
  }
  if (interaction) {
    let channel
    if (!interaction.channel) {
      if (interaction.channelId) {
        const Client = require('./client')
        channel = await Client.client.channels.fetch(interaction.channelId)
        if (!channel) {
          logger.error(nws`Failed to get channel ${interaction.channelId} in \
            replyOrFollowUp:\n${JSON.stringify(content)}`)
          return null
        }
      } else {
        logger.error(nws`Channel is ${interaction.channel} and channelId is \
          ${interaction.channelId} in replyOrFollowUp:\n${JSON.stringify(content)}`)
        return null
      }
    } else {
      channel = interaction.channel
    }
    if ((typeof channel.isText === 'function') && channel.isText()) {
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
      if (channel.type === 'GUILD_VOICE') { // This is expected, bug in Discord.js
        return null
      } else {
        logger.error(nws`Malformed channel in \
            replyOrFollowUp:\n${JSON.stringify(interaction.channel)}`)
        return null
      }
    }
  } else {
    logger.error(`No interaction in replyOrFollowUp:\n${JSON.stringify(content)}`)
    return null
  }
}