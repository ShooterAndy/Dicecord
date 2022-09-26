const _ = require('underscore')
const {
  MIN_ORDER_NUMBER,
  MAX_ORDER_NUMBER,
  ORDER_UL_KEY,
  ORDER_OL_KEY,
} = require('../helpers/constants')

const nws = require('../helpers/nws')
const errorEmbed = require('../helpers/errorEmbed')
const saveableReplyEmbed = require('../helpers/saveableReplyEmbed')
const genericCommandSaver = require('../helpers/genericCommandSaver')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')

module.exports = async (interaction, args) => {
  if (!interaction) return
  const { items } = args
  let { type, originalInteraction } = args
  if (!originalInteraction) originalInteraction = interaction

  let separator = ','
  if (items.indexOf('\n') > 0) {
    separator = '\n'
  }

  const choiceParts = items.split(separator)
  if (choiceParts.length < MIN_ORDER_NUMBER) {
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`Not enough choices to order, \
      please provide at least ${MIN_ORDER_NUMBER}.`))
  }

  if (choiceParts.length > MAX_ORDER_NUMBER) {
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`Too many choices to order, please \
      provide fewer than ${MAX_ORDER_NUMBER}.`))
  }

  let choices = []
  _.each(choiceParts, choice => {
    let trimmedChoice = choice.trim()
    if (trimmedChoice.length) {
      choices.push(trimmedChoice)
    }
  })

  if (choices.length < MIN_ORDER_NUMBER) {
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`Not enough actual choices to \
      order, please provide at least ${MIN_ORDER_NUMBER}.`))
  }

  let listType = -1
  if (type) {
    type = type.toLowerCase()
    if (type === ORDER_UL_KEY) {
      listType = 0
    } else if (type === ORDER_OL_KEY) {
      listType = 1
    } else {
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`List type "${type}" not \
        recognized, please use either \`${ORDER_OL_KEY}\` or \`${ORDER_UL_KEY}\`.`))
    }
  }

  let choicesString = ''
  _.each(_.shuffle(choices), (choice, i) =>  {
    if (listType === -1) {
      choicesString += choice + (i === choices.length - 1 ? '' : ', ')
    }
    else if (listType === 0) {
      choicesString += '* ' + choice + '\n'
    }
    else {
      choicesString += (i + 1) + '. ' + choice + '\n'
    }
  })

  const reply = saveableReplyEmbed.get('Ordered items in your list:', choicesString)
  reply.fetchReply = true

  const r = await replyOrFollowUp(interaction, reply)
  if (!r) return null

  const parameters = [{ name: 'items', type: 'STRING', value: items }]
  if (type) parameters.push({ name: 'type', type: 'STRING', value: type })
  await genericCommandSaver.launch(originalInteraction, r, parameters)
}