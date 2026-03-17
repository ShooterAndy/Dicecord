const { EmbedBuilder } = require('discord.js')
const logger = require('./logger')
const { ICON_URL } = require('./constants')
const truncate = require('./truncate')

module.exports = {
  get(text) {
    let embed
    try {
      const description = truncate(
        text || 'Unknown error. Please contact the bot creator.',
        truncate.MAX_EMBED_DESCRIPTION_LENGTH,
        truncate.EMBED_TRUNCATION_SUFFIX
      )
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