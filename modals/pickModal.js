const {
  TextInputComponent,
  MessageActionRow,
  Modal
} = require('discord.js')
const { MAX_PICK_NUMBER, YES_EMOJI, NO_EMOJI } = require('../helpers/constants')
const handler = require('../commandHandlers/pick')

const itemsInput = new TextInputComponent()
  .setCustomId('items')
  .setLabel('Items list (separate by new lines or commas)')
  .setPlaceholder('First item\nSecond item\nThird item')
  .setRequired(true)
  .setStyle('PARAGRAPH')
const itemsRow = new MessageActionRow().addComponents(itemsInput)

const amountInput = new TextInputComponent()
  .setCustomId('amount')
  .setLabel(`How many items to pick?`)
  .setPlaceholder(`Please enter a number from 1 to ${MAX_PICK_NUMBER} (default: 1)`)
  .setStyle('SHORT')
const amountRow = new MessageActionRow().addComponents(amountInput)

const showRemainingInput = new TextInputComponent()
  .setCustomId('show_remaining')
  .setLabel(`Show un-picked items as well?`)
  .setPlaceholder(`Leave empty for "${NO_EMOJI} no", type anything for "${YES_EMOJI} yes"`)
  .setStyle('SHORT')
const showRemainingRow = new MessageActionRow().addComponents(showRemainingInput)

module.exports = {
  modal: new Modal()
    .setCustomId('pickModal')
    .setTitle('/pick options')
    .addComponents(itemsRow, amountRow, showRemainingRow),
  async processSubmission(interaction) {
    if (!interaction || !interaction.fields) return
    const items = interaction.fields.getTextInputValue('items')
    const amount = interaction.fields.getTextInputValue('amount')
    const showRemaining = interaction.fields.getTextInputValue('show_remaining')
    await interaction.deferReply()
    return await handler(interaction, { items, amount, showRemaining })
  }
}