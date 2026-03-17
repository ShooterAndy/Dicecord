const { EmbedBuilder } = require('discord.js')
const logger = require('./logger')
const { ICON_URL, MAX_EMBED_DESCRIPTION_LENGTH } = require('./constants')

const TRUNCATION_SUFFIX = '\n\n… _(message truncated due to Discord character limit)_'

module.exports = {
  get(text) {
    let embed
    try {
      let description = text || 'Unknown error. Please contact the bot creator.'
      if (description.length > MAX_EMBED_DESCRIPTION_LENGTH) {
        description = description.slice(0, MAX_EMBED_DESCRIPTION_LENGTH - TRUNCATION_SUFFIX.length)
          + TRUNCATION_SUFFIX
      }
      embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setAuthor({ name: 'Error', iconURL: ICON_URL })
        .setDescription(description)
    } catch (error) {
      logger.error('Failed to create an error embed', error)
    }

    return { embeds: [embed] }
  }
}