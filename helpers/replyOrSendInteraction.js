const logger = require('./logger')
const nws = require('./nws')

module.exports = async (interaction, content) => {
  if (interaction) {
    if (interaction.channel && (typeof interaction.channel.isText === 'function') &&
      interaction.channel.isText()) {
      if (interaction.isRepliable() && !interaction.replied) {
        content.fetchReply = true
        return await interaction.reply(content)
          .catch(e => logger.error('Failed to reply to an interaction', e))
      } else {
        content.fetchReply = true
        return await interaction.followUp(content)
          .catch(e => logger.error('Failed to follow up an interaction', e))
      }
    } else {
      if (interaction.channel) {
        if (interaction.channel.type === 'GUILD_VOICE') { // This is expected
          return null
        } else {
          logger.error(nws`Malformed channel in \
            replyOrSendInteraction:\n${JSON.stringify(interaction.channel)}`)
          return null
        }
      } else {
        logger.error(`Missing channel in replyOrSendInteraction`)
        return null
      }
    }
  } else {
     logger.error('No interaction in replyOrSendInteraction')
    return null
   }
}