const { EmbedBuilder } = require('discord.js')
const logger = require('./logger')
const { ICON_URL, PRIMARY_COLOR } = require('./constants')
const truncate = require('./truncate')

module.exports = {
  get(name, text, footer) {
    let embed
    try {
      embed = new EmbedBuilder()
        .setColor(PRIMARY_COLOR)
        .setAuthor({ name: name || 'Response', iconURL: ICON_URL })
      if (text) {
        embed.setDescription(truncate(
          text,
          truncate.MAX_EMBED_DESCRIPTION_LENGTH,
          truncate.EMBED_TRUNCATION_SUFFIX
        ))
      }
      if (footer) {
        embed.setFooter({ text: footer })
      }
    } catch (error) {
      logger.error(`Failed to create a common reply embed with name "${name}" and text "${text}"`,
        error)
      return null
    }

    return {
      embeds: [embed]
    }
  }
}