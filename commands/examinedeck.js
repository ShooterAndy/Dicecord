const pg = require('../helpers/pgHandler')
const {
  DECK_TYPES_DB_NAME,
  DECK_TYPES_COLUMNS,
  ERROR_PREFIX
} = require('../helpers/constants')
const replyOrSend = require('../helpers/replyOrSend')
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
      return replyOrSend(nws`${ERROR_PREFIX}Please enter the name of the deck you wish to \
        examine, for example:\n\`${args.prefix}${args.commandName} poker-color\``, args.message)
    }
    let result
    if (shouldShowCards) {
      result = await pg.db.oneOrNone(
        'SELECT ${description~},${deck~} FROM ${db#} WHERE ${deckId~} = ${deckIdValue}',
        {
          description: DECK_TYPES_COLUMNS.description,
          deck: DECK_TYPES_COLUMNS.deck,
          db: pg.addPrefix(DECK_TYPES_DB_NAME),
          deckId: DECK_TYPES_COLUMNS.id,
          deckIdValue: deckId
        }
      )
    } else {
      result = await pg.db.oneOrNone(
        'SELECT ${description~} FROM ${db#} WHERE ${deckId~} = ${deckIdValue}',
        {
          description: DECK_TYPES_COLUMNS.description,
          db: pg.addPrefix(DECK_TYPES_DB_NAME),
          deckId: DECK_TYPES_COLUMNS.id,
          deckIdValue: deckId
        }
      )
    }

    if (!result || !result.description) {
      return replyOrSend(nws`${ERROR_PREFIX}No deck type \`${deckId}\` exists. List all existing deck \
      types via the \`${args.prefix}listDeckTypes\` command.`, args.message)
    }
    let text = '`' + deckId + '`:\n> ' + result.description + '\n'
    if (shouldShowCards) {
      try {
        text += '\n Cards in this deck:\n > ' + JSON.parse(result.deck).join(', ') + '\n'
      } catch (error) {
        logger.error(`Failed to parse "${deckId}" deck`, error)
        return replyOrSend(`${ERROR_PREFIX}Failed to parse the deck. Please contact the bout author`,
          args.message)
      }
    } else {
      text += 'You can see the full deck by using the `' + args.prefix + 'examineDeck -full ' +
        deckId + '`'
    }
    return replyOrSend(text, args.message).catch(console.error)
  } catch (error) {
    logger.error(`Failed to get the info for deck "${deckId}"`, error)
    return replyOrSend(`${ERROR_PREFIX} Failed to get the information about this deck. Please \
      contact the author of this bot.`, args.message)
  }
};