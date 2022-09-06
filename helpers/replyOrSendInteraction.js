const logger = require('./logger')

module.exports = async (interaction, content) => {
  if (interaction) {
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
     logger.error('No interaction in replyOrSendInteraction')
   }
}