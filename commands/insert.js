const pg = require('../helpers/pgHandler')
const random = require('random')
const {
  DECKS_DB_NAME,
  DECKS_COLUMNS,
  ERROR_PREFIX,
  DECKS_EXPIRE_AFTER,
  CARD_SEPARATOR
} = require('../helpers/constants')
const replyOrSend = require('../helpers/replyOrSend')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')

module.exports = async (args) => {
  try {
    const deckFromDb = await getDeckFromDb(args.message)
    let deck = await processDeck(args.message, deckFromDb, args.prefix)
    const cards = await processCards(args.commandText.trim(), args.prefix)
    deck = insertCardsIntoDeck(deck, cards)
    const text = await saveDeck(args.message, deck, cards.length)
    return replyOrSend(text, args.message)
  } catch (error) {
    return replyOrSend(error, args.message)
  }
}

const processCards = async (commandText, prefix) => {
  const cardsText = commandText.trim()
  if (!cardsText) {
    throw nws`Please specify the cards you want to insert, for example: \`${prefix}insert 2 of \
    Spades, 3 of Spades, 4 of Spades, Ace of Spades\`.`
  }
  const cardParts = cardsText.split(CARD_SEPARATOR)
  const cards = []
  cardParts.forEach(cardPart => {
    const card = cardPart.trim()
    if (card) {
      cards.push(card)
    }
  })
  if (!cards.length) {
    throw nws`Please specify the cards you want to insert, for example: \`${prefix}insert 2 of \
    Spades, 3 of Spades, 4 of Spades, Ace of Spades\`.`
  }

  return cards
}

const getDeckFromDb = async (message) => {
  try {
    return pg.db.oneOrNone(
      'SELECT ${deck~} FROM ${db#} WHERE ${channelId~} = ${channelIdValue}',
      {
        deck: DECKS_COLUMNS.deck,
        db: pg.addPrefix(DECKS_DB_NAME),
        channelId: DECKS_COLUMNS.channel_id,
        channelIdValue: message.channel.id
      })
  } catch(error) {
    logger.error(`Failed to get the deck for channel "${message.channel.id}"`, error)
    throw error
  }
}

const processDeck = async (message, deckFromDb, prefix) => {
  if (!deckFromDb || !deckFromDb[DECKS_COLUMNS.deck]) {
    throw nws`${ERROR_PREFIX}Couldn't find a deck for this channel. Please \
      \`${prefix}shuffle\` one first. If there was a deck, perhaps it expired and was \
      automatically removed after ${DECKS_EXPIRE_AFTER} of not being drawn from?`
  }
  try {
    return JSON.parse(deckFromDb[DECKS_COLUMNS.deck]);
  } catch (error) {
    logger.error(nws`Failed to parse the deck for channel "${message.channel.id}"`, error)
    throw `${ERROR_PREFIX}Failed to process the deck. Please contact the bot author.`
  }
}

const insertCardsIntoDeck = (deck, cards) => {
  cards.forEach(card => {
    const position = random.integer(0, deck.length)
    deck.splice(position, 0, card)
  })

  return deck
}

const saveDeck = async (message, deck, insertedCardsNumber) => {
  try {
    await pg.db.none(
      'UPDATE ${db#} SET ${deck~} = ${deckValue}, ${timestamp~} = NOW() ' +
      'WHERE ${channelId~}=${channelIdValue}',
      {
        db: pg.addPrefix(DECKS_DB_NAME),
        deck: DECKS_COLUMNS.deck,
        deckValue: JSON.stringify(deck),
        channelId: DECKS_COLUMNS.channel_id,
        channelIdValue: message.channel.id,
        timestamp: DECKS_COLUMNS.timestamp
      }
    )
    return `Successfully inserted ${insertedCardsNumber} cards into your deck!`
  } catch (error) {
    logger.error(`Failed to update the deck for channel "${message.channel.id}"`, error)
    throw `${ERROR_PREFIX}Failed to save the deck. Please contact the bot author.`
  }
}
