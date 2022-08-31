const { MessageEmbed } = require('discord.js')
const logger = require('./logger')
const { ICON_URL } = require('./constants')

module.exports = {
  get(text) {
    let embed
    try {
      embed = new MessageEmbed()
        .setColor('#FFFF00')
        .setAuthor({ name: 'Warning', iconURL: ICON_URL })
        .setDescription(text || 'Unknown warning. Please contact the bot creator.')
    } catch (error) {
      logger.error('Failed to create a warning embed', error)
    }

    return { embeds: [embed] }
  }
}