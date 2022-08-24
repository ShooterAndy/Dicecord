const { MessageEmbed } = require('discord.js')
const logger = require('./logger')
const { ICON_URL } = require('./constants')

module.exports = {
  get(text) {
    let embed
    try {
      embed = new MessageEmbed()
        .setColor('#FF0000')
        .setAuthor({ name: 'Error', iconURL: ICON_URL })
        .setDescription(text || 'Unknown error. Please contact the bot creator.')
    } catch (error) {
      logger.error('Failed to create an error embed', error)
    }

    return { embeds: [embed] }
  }
}