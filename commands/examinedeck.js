const pg = require('../helpers/pgHandler')
const {
  DECK_TYPES_DB_NAME,
  DECK_TYPES_COLUMNS,
  ERROR_PREFIX
} = require('../helpers/constants')
const reply = require('../helpers/reply')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')

module.exports = async (args) => {
  const firstArg = args.commandText.trim().split(' ')[0].toLowerCase()
  let deckId = firstArg
  let shouldShowCards = false
  if (firstArg === '-full') {
    shouldShowCards = true
    deckId = args.commandText.trim().slice(firstArg.length).trim()
  }
  try {
    if (!deckId) {
      return reply(nws`${ERROR_PREFIX}Please enter the name of the deck you wish to \
        examine, for example:\n\`${args.prefix}${args.commandName} poker-color\``, args.message)
    }
    const result = await pg.oneOrNone(
      DECK_TYPES_DB_NAME,
      `WHERE id = '${deckId}'`,
      DECK_TYPES_COLUMNS.description +
      (shouldShowCards ? (',' + DECK_TYPES_COLUMNS.deck) : '')
    )
    if (!result || !result.length) {
      return reply(nws`${ERROR_PREFIX}No deck type \`${deckId}\` exists. List all existing deck \
      types via the \`${args.prefix}listDeckTypes\` command.`, args.message)
    }
    let text = '`' + deckId + '`:\n> ' + result.description + '\n'
    if (shouldShowCards) {
      text += '\n Cards in this deck:\n > ' + JSON.parse(result.deck).join(', ') + '\n'
    } else {
      text += 'You can see the full deck by using the `' + args.prefix + 'examineDeck -full ' +
        deckId + '`'
    }
    return reply(text, args.message).catch(console.error)
  } catch (error) {
    logger.error(`Failed to get the info for deck "${deckId}"`, error)
    return reply(`${ERROR_PREFIX} Failed to get the information about this deck. Please \
      contact the author of this bot.`, args.message)
  }
};