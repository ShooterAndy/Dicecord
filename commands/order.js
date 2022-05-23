const _ = require('underscore')
const {
  MIN_ORDER_NUMBER,
  MAX_ORDER_NUMBER,
  ERROR_PREFIX
} = require('../helpers/constants')
const replyOrSend = require('../helpers/replyOrSend')
const nws = require('../helpers/nws')

module.exports = args => {
  if(!args.commandText) {
    return replyOrSend(nws`${ERROR_PREFIX}No items to order. Please input something like this:\n\
      \`${args.prefix}${args.commandName} First item, Another item, ...\`, or check out \
      \`${args.prefix}help order\` for more info.`, args.message)
  }

  let commandText = args.commandText
  let list = -1
  if(commandText.trim().indexOf('-ul ') === 0) {
    list = 0
    commandText = commandText.slice(commandText.indexOf('-ul ') + 4)
  }
  else if(commandText.trim().indexOf('-ol ') === 0) {
    list = 1;
    commandText = commandText.slice(commandText.indexOf('-ol ') + 4)
  }

  const choiceParts = commandText.split(',')
  if(choiceParts.length < MIN_ORDER_NUMBER) {
    return replyOrSend(nws`${ERROR_PREFIX}Not enough items to order, please provide at least \
      ${MIN_ORDER_NUMBER}.`, args.message)
  }
  if(choiceParts.length > MAX_ORDER_NUMBER) {
    return replyOrSend(nws`${ERROR_PREFIX}Too many items to order, please provide less than \
      ${MAX_ORDER_NUMBER}.`, args.message)
  }
  let choices = []
  _.each(choiceParts, function(choice) {
    let trimmedChoice = choice.trim()
    if(trimmedChoice.length) {
      choices.push(trimmedChoice)
    }
  });
  if(choices.length < MIN_ORDER_NUMBER) {
    return replyOrSend(nws`${ERROR_PREFIX}Not enough actual items to order, please provide at least \
      ${MIN_ORDER_NUMBER}.`, args.message)
  }

  let choicesString = ''
  _.each(_.shuffle(choices), (choice, i) =>  {
    if(list === -1) {
      choicesString += choice + (i === choices.length - 1 ? '' : ', ')
    }
    else if(list === 0) {
      choicesString += '* ' + choice + '\n'
    }
    else {
      choicesString += (i + 1) + '. ' + choice + '\n'
    }
  })

  return replyOrSend('Your list of items, randomly ordered:\n```' + choicesString + '```',
    args.message)
}