const commonReplyEmbed = require('../helpers/commonReplyEmbed')
const errorEmbed = require('../helpers/errorEmbed')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')
const Client = require('../helpers/client')
const logger = require('../helpers/logger')

module.exports = async (interaction, args) => {
  const { setting, enabled } = args

  if (!interaction.guildId) {
    return await replyOrFollowUp(interaction,
      errorEmbed.get('Settings can only be changed within a server, not in DMs.'))
  }

  switch (setting) {
    case 'plain_text': {
      try {
        await Client.setPlainTextMode(interaction.guildId, enabled)
      } catch (err) {
        logger.error(`Failed to set plain_text setting`, err)
        return await replyOrFollowUp(interaction,
          errorEmbed.get('Failed to save the setting. Please try again later.'))
      }
      const status = enabled ? 'enabled' : 'disabled'
      return await replyOrFollowUp(interaction,
        commonReplyEmbed.get('Settings updated',
          `**Plain text mode** has been **${status}** for this server.\n\n` +
          (enabled
            ? 'The bot will now send replies as plain text instead of embeds.'
            : 'The bot will now send replies as embeds (the default).')))
    }
    default:
      return await replyOrFollowUp(interaction,
        errorEmbed.get(`Unknown setting: \`${setting}\`.`))
  }
}

