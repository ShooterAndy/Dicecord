const { MessageEmbed } = require('discord.js')
const logger = require('./logger')
const { ICON_URL, PRIMARY_COLOR } = require('./constants')

module.exports = {
  get(name, text, footer) {
    let embed
    try {
      embed = new MessageEmbed()
        .setColor(PRIMARY_COLOR)
        .setAuthor({ name: name || 'Response', iconURL: ICON_URL })
      if (text) {
        embed.setDescription(text)
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