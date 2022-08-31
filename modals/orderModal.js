const {
  TextInputComponent,
  MessageActionRow,
  Modal
} = require('discord.js')
const handler = require('../commandHandlers/order')

const itemsInput = new TextInputComponent()
  .setCustomId('items')
  .setLabel('Items list (separate by new lines or commas)')
  .setPlaceholder('First item\nSecond item\nThird item')
  .setRequired(true)
  .setStyle('PARAGRAPH')
const itemsRow = new MessageActionRow().addComponents(itemsInput)

const typeInput = new TextInputComponent()
  .setCustomId('type')
  .setLabel(`Type of the resulting list (optional)`)
  .setPlaceholder(`Leave empty, or type "ul" or "ol"`)
  .setStyle('SHORT')
const typeRow = new MessageActionRow().addComponents(typeInput)

module.exports = {
  modal: new Modal()
    .setCustomId('orderModal')
    .setTitle('/order options')
    .addComponents(itemsRow, typeRow),
  async processSubmission(interaction) {
    if (!interaction || !interaction.fields) return
    const itemsText = interaction.fields.getTextInputValue('items')
    const typeText = interaction.fields.getTextInputValue('type')
    return await handler(interaction, { itemsText, typeText })
  }
}