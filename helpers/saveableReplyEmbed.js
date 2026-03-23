const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const logger = require('./logger')
const { SAVE_EMOJI, GENERIC_SAVE_BUTTON_ID, GENERIC_GUILD_SAVE_BUTTON_ID } = require('./constants')
const commonReplyEmbed = require('./commonReplyEmbed')
const truncate = require('./truncate')

const _buildSaveButtons = (showGuildSave) => {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(GENERIC_SAVE_BUTTON_ID)
        .setLabel(showGuildSave ? 'Save for me' : 'Save command')
        .setEmoji(SAVE_EMOJI)
        .setStyle(ButtonStyle.Primary)
    )
  if (showGuildSave) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(GENERIC_GUILD_SAVE_BUTTON_ID)
        .setLabel('Save for server')
        .setEmoji(SAVE_EMOJI)
        .setStyle(ButtonStyle.Primary)
    )
  }
  return row
}

module.exports = {
  get(name, text, footer, { guildId } = {}) {
    let content
    try {
      content = commonReplyEmbed.get(name, text, footer)
    } catch (error) {
      logger.error(`Failed to create a saveable reply embed with name "${name}" and text "${text}"`,
        error)
    }

    if (!content) {
      // Fallback to plain text so callers don't crash
      const fallbackParts = []
      if (name) fallbackParts.push(`**${name}**`)
      if (text) fallbackParts.push(text)
      if (footer) fallbackParts.push(`_${footer}_`)
      content = {
        content: truncate(fallbackParts.join('\n'))
      }
    }

    content.components = [_buildSaveButtons(!!guildId)]

    return content
  }
}