const _ = require('underscore')
const {
  DEFAULT_DECK_TYPE,
  DECK_TYPES_DB_NAME,
  DECK_TYPES_COLUMNS,
  ERROR_PREFIX,
  COMMENT_SEPARATOR,
  DISCORD_CODE_REGEX
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const replyOrSend = require('../helpers/replyOrSend')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')

module.exports = async (args) => {
  const numberOfCardsToDraw = args.commandText.trim().split(' ')[0]
  const secondPart = args.commandText.trim().slice(numberOfCardsToDraw.length).trim()
  let comment
  let deckId = DEFAULT_DECK_TYPE
  if (secondPart.startsWith(COMMENT_SEPARATOR)) {
    comment = secondPart.slice(COMMENT_SEPARATOR.length).trim()
  } else if (secondPart) {
    deckId = secondPart.split(' ')[0]
    comment = secondPart.slice(deckId.length).trim()
    if (comment.startsWith(COMMENT_SEPARATOR)) {
      comment = comment.slice(COMMENT_SEPARATOR.length).trim()
    }
    comment = comment.replace(DISCORD_CODE_REGEX, '')
  }
  await processDrawShuffledCommand(args.message, numberOfCardsToDraw, deckId, comment, args.prefix,
    args.commandName)
};

const processDrawShuffledCommand =
  async (message, numberOfCardsToDraw, deckId, comment, prefix, commandName) => {
  if (numberOfCardsToDraw === '') {
    numberOfCardsToDraw = 1
  }
  numberOfCardsToDraw = parseInt(numberOfCardsToDraw)
  if (isNaN(numberOfCardsToDraw) || numberOfCardsToDraw < 1) {
    numberOfCardsToDraw = 1
  }

  try {
    const result = await pg.db.oneOrNone(
      'SELECT ${deck~} FROM ${db#} WHERE ${deckId~} = ${deckIdValue}',
      {
        deck: DECK_TYPES_COLUMNS.deck,
        db: pg.addPrefix(DECK_TYPES_DB_NAME),
        deckId: DECK_TYPES_COLUMNS.id,
        deckIdValue: deckId
      }
    )
    if (!result || !result.deck) {
      return replyOrSend(nws`${ERROR_PREFIX}No deck type \`${deckId}\` exists. List all existing deck \
      types via the \`${prefix}listDeckTypes\` command. Or did you write that as a comment? \
      Please note that specifying the deck type is now required before writing a comment, so it \
      should look like this: \`${prefix}${commandName} 3 poker ${COMMENT_SEPARATOR} your comment \
      here\`.`, message)
    }

    let deck
    try {
      deck = _.shuffle(JSON.parse(result.deck))
    } catch (error) {
      logger.error(`Failed to parse the "${deckId}" deck`, error)
      return replyOrSend(`${ERROR_PREFIX}Failed to parse the deck. Please contact the bot author.`,
        message)
    }
    numberOfCardsToDraw = parseInt(numberOfCardsToDraw)
    if (numberOfCardsToDraw > result.deck.length) {
      return replyOrSend(nws`${ERROR_PREFIX}Not enough cards in the deck (requested \
        ${numberOfCardsToDraw}, but the deck only has ${result.deck.length} cards in it. Please \
        draw fewer cards.`, message)
    }
    else {
      let text
      let drawnCards = deck.slice(0, numberOfCardsToDraw)
      let isOrAre = ' are'
      let cardOrCards = 'cards'
      if (numberOfCardsToDraw === 1) {
        isOrAre = '\'s'
        cardOrCards = 'card'
      }
      text = 'Here' + isOrAre + ' your ' + numberOfCardsToDraw + ' ' + cardOrCards + ' from a `' +
        deckId + '` deck: '
      if (comment) {
        text += '\n`' + comment + ':` '
      }

      text += drawnCards.join(', ')
      return replyOrSend(text, message)
    }
  } catch (error) {
    logger.error(`Failed to load the deck for the "${prefix}${commandName} ${deckId}" command`,
      error)
    return replyOrSend(`${ERROR_PREFIX}Failed to load the deck. Please contact the bot author.`,
      message)
  }
};