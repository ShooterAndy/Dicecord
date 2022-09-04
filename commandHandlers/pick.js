const random = require('random')
const _ = require('underscore')
const { MIN_PICK_NUMBER, MAX_PICK_NUMBER, } = require('../helpers/constants')

const nws = require('../helpers/nws')
const errorEmbed = require('../helpers/errorEmbed')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')

module.exports = async (interaction, args) => {
  if (!interaction) return
  const { itemsText, amountText, showRemaining } = args

  let separator = ','
  if (itemsText.indexOf('\n') > 0) {
    separator = '\n'
  }

  const choiceParts = itemsText.split(separator)
  if (choiceParts.length < MIN_PICK_NUMBER) {
    return await interaction.reply(errorEmbed.get(nws`Not enough choices to pick from, please \
      provide at least ${MIN_PICK_NUMBER}.`))
  }

  if (choiceParts.length > MAX_PICK_NUMBER) {
    return await interaction.reply(errorEmbed.get(nws`Too many choices to pick from, please \
      provide fewer than ${MAX_PICK_NUMBER}.`))
  }

  let choices = []
  _.each(choiceParts, choice => {
    let trimmedChoice = choice.trim()
    if (trimmedChoice.length) {
      choices.push(trimmedChoice)
    }
  })

  if (choices.length < MIN_PICK_NUMBER) {
    return await interaction.reply(errorEmbed.get(nws`Not enough actual choices to pick from, \
      please provide at least ${MIN_PICK_NUMBER}.`))
  }

  let amount
  if (!amountText) {
    amount = 1
  } else {
    amount = Number(amountText)
    if (isNaN(amount) || amount < 1) {
      return await interaction.reply(
        errorEmbed.get(`"${amountText}" is not a valid number of items to pick.`))
    }
    amount = Math.floor(amount)
    if (amount > choices.length) {
      return await interaction.reply(
        errorEmbed.get(`Can't pick ${amount} items out of a list of ${choices.length} items.`))
    }
  }

  const pickedChoices = []
  for (let i = 0; i < amount; i++) {
    pickedChoices.push(choices.splice(random.integer(0, choices.length - 1), 1))
  }

  return await interaction.reply(commonReplyEmbed.get(
    `Picked ${amount} items from your list:`,
    pickedChoices.join(', '),
    showRemaining ? (choices.length ?
      `Remaining items: ${choices.join(', ')}` : 'No items left in the list.') :
      null))
}