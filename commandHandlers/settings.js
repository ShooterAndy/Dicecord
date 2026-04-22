const commonReplyEmbed = require('../helpers/commonReplyEmbed')
const errorEmbed = require('../helpers/errorEmbed')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')
const Client = require('../helpers/client')
const logger = require('../helpers/logger')

const SETTINGS = {
  plain_text: { label: 'Plain text mode', get: (guildId) => Client.getPlainTextMode(guildId) }
}

const formatSettingValue = (enabled) => enabled ? '✅ enabled' : '❌ disabled'

module.exports = async (interaction, args) => {
  const { setting, enabled } = args

  if (!interaction.guildId) {
    return await replyOrFollowUp(interaction,
      errorEmbed.get('Settings can only be changed within a server, not in DMs.'))
  }

  // No setting specified — list all current settings
  if (!setting) {
    if (enabled != null) {
      return await replyOrFollowUp(interaction,
        errorEmbed.get('Please specify which setting you want to change.'))
    }
    let text = ''
    for (const [key, info] of Object.entries(SETTINGS)) {
      const value = await info.get(interaction.guildId)
      text += `**${info.label}** (\`${key}\`): ${formatSettingValue(value)}\n`
    }
    return await replyOrFollowUp(interaction,
      commonReplyEmbed.get('Current settings', text.trim()))
  }

  // Setting specified but no value — show that setting's current value
  if (enabled == null) {
    const info = SETTINGS[setting]
    if (!info) {
      return await replyOrFollowUp(interaction,
        errorEmbed.get(`Unknown setting: \`${setting}\`.`))
    }
    const value = await info.get(interaction.guildId)
    return await replyOrFollowUp(interaction,
      commonReplyEmbed.get('Current setting',
        `**${info.label}** (\`${setting}\`): ${formatSettingValue(value)}`))
  }

  // Both setting and value specified — update
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

