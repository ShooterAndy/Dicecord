const pg = require('../helpers/pgHandler')
const random = require('random')
const {
  DECKS_DB_NAME,
  DECKS_COLUMNS,
  DECKS_EXPIRE_AFTER,
  CARD_SEPARATOR
} = require('../helpers/constants')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const errorEmbed = require('../helpers/errorEmbed')
const saveableReplyEmbed = require('../helpers/saveableReplyEmbed')
const genericCommandSaver = require('../helpers/genericCommandSaver')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')

module.exports = async (interaction, args) => {
  try {
    const deckFromDb = await getDeckFromDb(interaction)
    let deck = await processDeck(interaction, deckFromDb)
    const cards = await processCards(args.cards)
    deck = insertCardsIntoDeck(deck, cards)
    const text = await saveDeck(interaction, deck, cards)
    const reply = saveableReplyEmbed.get('Inserted!', text)
    reply.fetchReply = true

    const r = await replyOrFollowUp(interaction, reply)
    genericCommandSaver.launch(interaction, r)
  } catch (error) {
    return await replyOrFollowUp(interaction, errorEmbed.get(error.toString()))
  }
}

const processCards = async (cardsText) => {
  cardsText = cardsText.trim()
  if (!cardsText) {
    throw nws`Please specify the cards you want to insert.`
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
    throw nws`Please specify the cards you want to insert.`
  }

  return cards
}

const getDeckFromDb = async (interaction) => {
  try {
    return pg.db.oneOrNone(
      'SELECT ${deck~} FROM ${db#} WHERE ${channelId~} = ${channelIdValue}',
      {
        deck: DECKS_COLUMNS.deck,
        db: pg.addPrefix(DECKS_DB_NAME),
        channelId: DECKS_COLUMNS.channel_id,
        channelIdValue: interaction.channel.id
      })
  } catch(error) {
    logger.error(`Failed to get the deck for channel "${interaction.channel.id}"`, error)
    throw error
  }
}

const processDeck = async (interaction, deckFromDb) => {
  if (!deckFromDb || !deckFromDb[DECKS_COLUMNS.deck]) {
    throw nws`Couldn't find a deck for this channel. Please \
      \`/shuffle\` one first. If there was a deck, perhaps it expired and was \
      automatically removed after ${DECKS_EXPIRE_AFTER} of not being drawn from?`
  }
  try {
    return JSON.parse(deckFromDb[DECKS_COLUMNS.deck]);
  } catch (error) {
    logger.error(nws`Failed to parse the deck for channel "${interaction.channel.id}"`, error)
    throw `Failed to process the deck. Please contact the bot author.`
  }
}

const insertCardsIntoDeck = (deck, cards) => {
  cards.forEach(card => {
    const position = random.integer(0, deck.length)
    deck.splice(position, 0, card)
  })

  return deck
}

const saveDeck = async (interaction, deck, cards) => {
  try {
    await pg.db.none(
      'UPDATE ${db#} SET ${deck~} = ${deckValue}, ${timestamp~} = NOW() ' +
      'WHERE ${channelId~}=${channelIdValue}',
      {
        db: pg.addPrefix(DECKS_DB_NAME),
        deck: DECKS_COLUMNS.deck,
        deckValue: JSON.stringify(deck),
        channelId: DECKS_COLUMNS.channel_id,
        channelIdValue: interaction.channel.id,
        timestamp: DECKS_COLUMNS.timestamp
      }
    )
    if (cards.length === 1) {
      return `Successfully inserted this card into your deck:\n\`${cards[0]}\``
    } else {
      return nws`Successfully inserted these ${cards.length} cards into your \
        deck:\n\`${cards.join('`, `')}\``
    }
  } catch (error) {
    logger.error(`Failed to update the deck for channel "${interaction.channel.id}"`, error)
    throw `Failed to save the deck. Please contact the bot author.`
  }
}
