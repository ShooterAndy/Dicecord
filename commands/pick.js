const random = require('random')
const _ = require('underscore')
const {
  MIN_PICK_NUMBER,
  MAX_PICK_NUMBER,
  ERROR_PREFIX
} = require('../helpers/constants')
const replyOrSend = require('../helpers/replyOrSend')
const nws = require('../helpers/nws')

module.exports = args => {
  if(!args.commandText) {
    return replyOrSend(nws`${ERROR_PREFIX}No choices to pick from. Please input something like this:\n\
      \`${args.prefix}${args.commandName} One choice, Another choice, ...\`, or check out \
      \`${args.prefix}help pick\` for more info.`, args.message)
  }

  const choiceParts = args.commandText.split(',')
  if(choiceParts.length < MIN_PICK_NUMBER) {
    return replyOrSend(nws`${ERROR_PREFIX}Not enough choices to pick from, please provide at least \
      ${MIN_PICK_NUMBER}.`, args.message)
  }

  if(choiceParts.length > MAX_PICK_NUMBER) {
    return replyOrSend(nws`${ERROR_PREFIX}Too many choices to pick from, please provide fewer than \
      ${MAX_PICK_NUMBER}.`, args.message)
  }

  let choices = []
  _.each(choiceParts, function(choice) {
    let trimmedChoice = choice.trim()
    if(trimmedChoice.length) {
      choices.push(trimmedChoice)
    }
  })

  if(choices.length < MIN_PICK_NUMBER) {
    return replyOrSend(nws`${ERROR_PREFIX}Not enough actual choices to pick from, please provide at \
      least ${MIN_PICK_NUMBER}.`, args.message)
  }

  return replyOrSend(choices[random.integer(0, choices.length - 1)], args.message)
};