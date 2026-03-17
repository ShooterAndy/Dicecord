const {
  TextInputBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputStyle
} = require('discord.js')
const { MAX_PICK_NUMBER, YES_EMOJI, NO_EMOJI } = require('../helpers/constants')

const itemsInput = new TextInputBuilder()
  .setCustomId('items')
  .setLabel('Items list (separate by new lines or commas)')
  .setPlaceholder('First item\nSecond item\nThird item')
  .setRequired(true)
  .setStyle(TextInputStyle.Paragraph)
const itemsRow = new ActionRowBuilder().addComponents(itemsInput)

const amountInput = new TextInputBuilder()
  .setCustomId('amount')
  .setLabel(`How many items to pick?`)
  .setPlaceholder(`Please enter a number from 1 to ${MAX_PICK_NUMBER} (default: 1)`)
  .setRequired(false)
  .setStyle(TextInputStyle.Short)
const amountRow = new ActionRowBuilder().addComponents(amountInput)

const showRemainingInput = new TextInputBuilder()
  .setCustomId('show_remaining')
  .setLabel(`Show un-picked items as well?`)
  .setPlaceholder(`Leave empty for "${NO_EMOJI} no", type anything for "${YES_EMOJI} yes"`)
  .setRequired(false)
  .setStyle(TextInputStyle.Short)
const showRemainingRow = new ActionRowBuilder().addComponents(showRemainingInput)

module.exports = {
  modal: new ModalBuilder()
    .setCustomId('pickModal')
    .setTitle('/pick options')
    .addComponents(itemsRow, amountRow, showRemainingRow)
}