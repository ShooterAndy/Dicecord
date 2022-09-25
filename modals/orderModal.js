const {
  TextInputComponent,
  MessageActionRow,
  Modal
} = require('discord.js')

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
    .addComponents(itemsRow, typeRow)
}