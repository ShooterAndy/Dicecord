const _ = require('underscore')
const {
  MIN_ORDER_NUMBER,
  MAX_ORDER_NUMBER,
  ORDER_UL_KEY,
  ORDER_OL_KEY,
} = require('../helpers/constants')

const nws = require('../helpers/nws')
const errorEmbed = require('../helpers/errorEmbed')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')

module.exports = async (interaction, args) => {
  if (!interaction) return
  const { itemsText } = args
  let { typeText } = args

  let separator = ','
  if (itemsText.indexOf('\n') > 0) {
    separator = '\n'
  }

  const choiceParts = itemsText.split(separator)
  if (choiceParts.length < MIN_ORDER_NUMBER) {
    return await interaction.reply(errorEmbed.get(nws`Not enough choices to order, please provide \
      at least ${MIN_ORDER_NUMBER}.`))
  }

  if (choiceParts.length > MAX_ORDER_NUMBER) {
    return await interaction.reply(errorEmbed.get(nws`Too many choices to order, please provide \
      fewer than ${MAX_ORDER_NUMBER}.`))
  }

  let choices = []
  _.each(choiceParts, choice => {
    let trimmedChoice = choice.trim()
    if (trimmedChoice.length) {
      choices.push(trimmedChoice)
    }
  })

  if (choices.length < MIN_ORDER_NUMBER) {
    return await interaction.reply(errorEmbed.get(nws`Not enough actual choices to order, please \
      provide at least ${MIN_ORDER_NUMBER}.`))
  }

  let listType = -1
  if (typeText) {
    typeText = typeText.toLowerCase()
    if (typeText === ORDER_UL_KEY) {
      listType = 0
    } else if (typeText === ORDER_OL_KEY) {
      listType = 1
    } else {
      return await interaction.reply(errorEmbed.get(nws`List type "${typeText}" not recognized, \
        please use either \`${ORDER_OL_KEY}\` or \`${ORDER_UL_KEY}\`.`))
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

  return await interaction.reply(commonReplyEmbed.get('Ordered items in your list:',
    choicesString))
}