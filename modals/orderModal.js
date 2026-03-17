const {
  TextInputBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputStyle
} = require('discord.js')

const itemsInput = new TextInputBuilder()
  .setCustomId('items')
  .setLabel('Items list (separate by new lines or commas)')
  .setPlaceholder('First item\nSecond item\nThird item')
  .setRequired(true)
  .setStyle(TextInputStyle.Paragraph)
const itemsRow = new ActionRowBuilder().addComponents(itemsInput)

const typeInput = new TextInputBuilder()
  .setCustomId('type')
  .setLabel(`Type of the resulting list (optional)`)
  .setPlaceholder(`Leave empty, or type "ul" or "ol"`)
  .setRequired(false)
  .setStyle(TextInputStyle.Short)
const typeRow = new ActionRowBuilder().addComponents(typeInput)

module.exports = {
  modal: new ModalBuilder()
    .setCustomId('orderModal')
    .setTitle('/order options')
    .addComponents(itemsRow, typeRow)
}