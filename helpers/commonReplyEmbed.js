const { EmbedBuilder } = require('discord.js')
const logger = require('./logger')
const { ICON_URL, PRIMARY_COLOR, MAX_EMBED_DESCRIPTION_LENGTH } = require('./constants')

const TRUNCATION_SUFFIX = '\n\n… _(message truncated due to Discord character limit)_'

module.exports = {
  get(name, text, footer) {
    let embed
    try {
      embed = new EmbedBuilder()
        .setColor(PRIMARY_COLOR)
        .setAuthor({ name: name || 'Response', iconURL: ICON_URL })
      if (text) {
        let description = text
        if (description.length > MAX_EMBED_DESCRIPTION_LENGTH) {
          description = description.slice(0, MAX_EMBED_DESCRIPTION_LENGTH - TRUNCATION_SUFFIX.length)
            + TRUNCATION_SUFFIX
        }
        embed.setDescription(description)
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