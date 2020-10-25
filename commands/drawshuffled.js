const _ = require('underscore')
const {
  DEFAULT_DECK_TYPE,
  DECK_TYPES_DB_NAME,
  DECK_TYPES_COLUMNS,
  ERROR_PREFIX,
  COMMENT_SEPARATOR
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const reply = require('../helpers/reply')
const nws = require('../helpers/nws')

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
  }
  await processDrawShuffledCommand(args.message, numberOfCardsToDraw, deckId, comment, args.prefix,
    args.commandName)
};

const processDrawShuffledCommand =
  async (message, numberOfCardsToDraw, deckId, comment, prefix, commandName) => {
  if (isNaN(numberOfCardsToDraw)) {
    return reply(nws`${ERROR_PREFIX}"${numberOfCardsToDraw}" is not a valid number of cards to \
      draw.`, message)
  }

  try {
    const result = await pg.oneOrNone(DECK_TYPES_DB_NAME, `WHERE id = '${deckId}'`,
      DECK_TYPES_COLUMNS.deck)
    if (!result || !result.length) {
      return reply(nws`${ERROR_PREFIX}No deck type \`${deckId}\` exists. List all existing deck \
      types via the \`${prefix}listDeckTypes\` command. Or did you write that as a comment? \
      Please note that specifying the deck type is now required before writing a comment, so it \
      should look like this: \`${prefix}${commandName} 3 poker ${COMMENT_SEPARATOR} your comment \
      here\`.`, message)
    }

    const deck = _.shuffle(JSON.parse(result.deck))
    numberOfCardsToDraw = parseInt(numberOfCardsToDraw)
    if (numberOfCardsToDraw > result.deck.length) {
      return reply(nws`${ERROR_PREFIX}Not enough cards in the deck (requested \
        ${numberOfCardsToDraw}, but the deck only has ${result.deck.length} cards in it. Please \
        draw fewer cards.`, message)
    }
    else {
      let text = ''
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
      return reply(text, message)
    }
  } catch (error) {
    console.error('-- > Failed to load the deck for the !drsh command:\n' + error)
    return reply(`${ERROR_PREFIX}Failed to load the deck. Please contact the bot author.`,
      message)
  }
};