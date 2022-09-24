const random = require('random')
const _ = require('underscore')
const { MIN_PICK_NUMBER, MAX_PICK_NUMBER, } = require('../helpers/constants')

const nws = require('../helpers/nws')
const errorEmbed = require('../helpers/errorEmbed')
const saveableReplyEmbed = require('../helpers/saveableReplyEmbed')
const genericCommandSaver = require('../helpers/genericCommandSaver')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')

module.exports = async (interaction, args) => {
  if (!interaction) return
  const { items, showRemaining } = args
  let { amount } = args

  let separator = ','
  if (items.indexOf('\n') > 0) {
    separator = '\n'
  }

  const choiceParts = items.split(separator)
  if (choiceParts.length < MIN_PICK_NUMBER) {
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`Not enough choices to pick from, \
      please provide at least ${MIN_PICK_NUMBER}.`))
  }

  if (choiceParts.length > MAX_PICK_NUMBER) {
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`Too many choices to pick from, \
      please provide fewer than ${MAX_PICK_NUMBER}.`))
  }

  let choices = []
  _.each(choiceParts, choice => {
    let trimmedChoice = choice.trim()
    if (trimmedChoice.length) {
      choices.push(trimmedChoice)
    }
  })

  if (choices.length < MIN_PICK_NUMBER) {
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`Not enough actual choices to \
      pick from, please provide at least ${MIN_PICK_NUMBER}.`))
  }

  let parsedAmount
  if (!amount) {
    parsedAmount = 1
  } else {
    parsedAmount = Number(amount)
    if (isNaN(parsedAmount) || parsedAmount < 1) {
      return await replyOrFollowUp(interaction,
        errorEmbed.get(`"${amount}" is not a valid number of items to pick.`))
    }
    parsedAmount = Math.floor(parsedAmount)
    if (parsedAmount > choices.length) {
      return await replyOrFollowUp(interaction,
        errorEmbed.get(
          `Can't pick ${parsedAmount} items out of a list of ${choices.length} items.`))
    }
  }

  const pickedChoices = []
  for (let i = 0; i < parsedAmount; i++) {
    pickedChoices.push(choices.splice(random.integer(0, choices.length - 1), 1))
  }

  const reply = saveableReplyEmbed.get(`Picked ${parsedAmount} items from your list:`,
    pickedChoices.join(', '),
    showRemaining ? (choices.length ?
        `Remaining items: ${choices.join(', ')}` : 'No items left in the list.') :
      null)
  reply.fetchReply = true

  const r = await replyOrFollowUp(interaction, reply)
  await genericCommandSaver.launch(interaction, r)
}