const _ = require('underscore')
const {
  DEFAULT_DECK_TYPE,
  DECK_TYPES_DB_NAME,
  DECK_TYPES_COLUMNS,
  DECKS_DB_NAME,
  DECKS_COLUMNS,
  ERROR_PREFIX,
  DECKS_EXPIRE_AFTER,
  CUSTOM_DECK_TYPE,
  CARD_SEPARATOR
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const nws = require('../helpers/nws')
const replyOrSend = require('../helpers/replyOrSend')
const logger = require('../helpers/logger')

module.exports = async (args) => {
  let deckId = DEFAULT_DECK_TYPE
  if (args.commandText.trim()) {
    deckId = args.commandText.trim().toLowerCase()
  }

  try {
    let deck
    if (deckId.startsWith(CUSTOM_DECK_TYPE)) {
      deckId = CUSTOM_DECK_TYPE
      deck = await processCustomDeck(args.commandText.trim(), args.prefix)
    } else {
      deck = await getAndProcessDeckFromDb(args.message, deckId, args.prefix)
    }
    const replyText = await saveShuffledDeck(args.message, deckId, deck)
    return replyOrSend(replyText, args.message)
  } catch (error) {
    return replyOrSend(error, args.message)
  }
}

const processCustomDeck = async (commandText, prefix) => {
  let deckText = commandText.slice(CUSTOM_DECK_TYPE.length).trim()
  if (!deckText) {
    throw nws`Please specify your custom deck, for example: \`${prefix}shuffle \
    ${CUSTOM_DECK_TYPE} 2 of Spades, 3 of Spades, 4 of Spades, Ace of Spades\`.`
  }
  if (deckText.indexOf(CARD_SEPARATOR) === -1) {
    throw nws`Your custom deck has only one card, please provide more than one, for \
    example: \`${prefix}shuffle ${CUSTOM_DECK_TYPE} 2 of Spades, 3 of Spades, 4 of Spades, \
    Ace of Spades\`.`
  }
  const cardParts = deckText.split(CARD_SEPARATOR)
  const cards = []
  cardParts.forEach(cardPart => {
    const card = cardPart.trim()
    if (card) {
      cards.push(card)
    }
  })
  if (cards.length < 2) {
    throw nws`Your custom deck has less than two non-empty cards, please provide more \
    than one, for example: \`${prefix}shuffle ${CUSTOM_DECK_TYPE} 2 of Spades, 3 of Spades, 4 of \
    Spades, Ace of Spades\`.`
  }

  return _.shuffle(cards)
}

const getAndProcessDeckFromDb = async (message, deckId, prefix) => {
  try {
    const deckDbResult = await getDeckFromDb(message, deckId)
    return shuffleDeckDbResult(message, deckDbResult, deckId, prefix)
  } catch (error) {
    throw error
  }
}

const getDeckFromDb = async (message, deckId) => {
  try {
    return pg.db.oneOrNone(
      'SELECT ${deck~} FROM ${db#} WHERE ${deckId~} = ${deckIdValue}',
      {
        deck: DECK_TYPES_COLUMNS.deck,
        db: pg.addPrefix(DECK_TYPES_DB_NAME),
        deckId: DECK_TYPES_COLUMNS.id,
        deckIdValue: deckId
      }
    )
  } catch (error) {
    throw nws`${ERROR_PREFIX}Failed to get the deck. Please contact the bot author.`
  }
}

const shuffleDeckDbResult = async (message, deckDbResult, deckId, prefix) => {
  if (!deckDbResult || !deckDbResult.deck) {
   throw nws`No deck type \`${deckId}\` exists. You could list all existing deck \
        types by using the \`${prefix}listDeckTypes\` command.`
  }
  try {
    return _.shuffle(JSON.parse(deckDbResult.deck))
  } catch (error) {
    logger.error(`Failed to parse ${deckId} deck for shuffle`, error)
    throw `${ERROR_PREFIX}Failed to get the deck. Please contact the bot author.`
  }
}

const saveShuffledDeck = async (message, deckId, deck) => {
  try {
    await pg.db.none(
      'INSERT INTO ${db#} (${channelId~}, ${deck~}, ${type~}, ${timestamp~}) ' +
      'VALUES (${channelIdValue}, ${deckValue}, ${typeValue}, NOW()) ' +
      'ON CONFLICT (${channelId~}) ' +
      'DO UPDATE SET ${deck~}=excluded.${deck~}, ${type~}=excluded.${type~}, ' +
      '${timestamp~}=excluded.${timestamp~}', {
        db: pg.addPrefix(DECKS_DB_NAME),
        channelId: DECKS_COLUMNS.channel_id,
        deck: DECKS_COLUMNS.deck,
        type: DECKS_COLUMNS.type_id,
        channelIdValue: message.channel.id,
        deckValue: JSON.stringify(deck),
        typeValue: deckId,
        timestamp: DECKS_COLUMNS.timestamp
      })
    return nws`Your \`${deckId}\` deck was shuffled!\nPlease be aware that this saved deck \
      will expire and be automatically deleted after ${DECKS_EXPIRE_AFTER} of last being \
      drawn from.`
  } catch(error) {
    logger.error(nws`Failed to update the deck for channel ${message.channel.id}`, error)
    throw `${ERROR_PREFIX} Failed to save the deck. Please contact the bot author.`
  }
}