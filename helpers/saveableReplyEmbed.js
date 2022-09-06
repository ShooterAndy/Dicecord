const { MessageActionRow, MessageButton } = require('discord.js')
const logger = require('./logger')
const { SAVE_EMOJI, GENERIC_SAVE_BUTTON_ID } = require('./constants')
const commonReplyEmbed = require('./commonReplyEmbed')

module.exports = {
  get(name, text, footer) {
    let content
    try {
      content = commonReplyEmbed.get(name, text, footer)
    } catch (error) {
      logger.error(`Failed to create a saveable reply embed with name "${name}" and text "${text}"`,
        error)
      return null
    }

    const buttonsRow = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId(GENERIC_SAVE_BUTTON_ID)
          .setLabel('Save command')
          .setEmoji(SAVE_EMOJI)
          .setStyle('PRIMARY')
      )

    content.components = [buttonsRow]

    return content
  }
}