const _ = require('underscore')
const {
  DEFAULT_DECK_TYPE,
  DECK_TYPES_DB_NAME,
  DECK_TYPES_COLUMNS,
  DECKS_DB_NAME,
  DECKS_COLUMNS,
  DECKS_EXPIRE_AFTER,
  CUSTOM_DECK_TYPE,
  CARD_SEPARATOR
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const errorEmbed = require('../helpers/errorEmbed')
const saveableReplyEmbed = require('../helpers/saveableReplyEmbed')
const genericCommandSaver = require('../helpers/genericCommandSaver')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')

module.exports = async (interaction, args) => {
  let { customCards, deckId } = args
  if (!deckId) deckId = DEFAULT_DECK_TYPE
  deckId = deckId.toLowerCase()

  try {
    let deck
    if (deckId === CUSTOM_DECK_TYPE || customCards) {
      deckId = CUSTOM_DECK_TYPE
      deck = await processCustomDeck(customCards)
    } else {
      deck = await getAndProcessDeckFromDb(deckId)
    }
    const replyText = await saveShuffledDeck(interaction, deckId, deck)
    const reply = saveableReplyEmbed.get('Shuffled!', replyText)
    reply.fetchReply = true

    const r = await replyOrFollowUp(interaction, reply)
    if (!r) return null

    await genericCommandSaver.launch(interaction, r)
  } catch (error) {
    return await replyOrFollowUp(interaction, errorEmbed.get(error.toString()))
  }
}

const processCustomDeck = async (customCards) => {
  if (!customCards) {
    throw nws`Please specify your custom deck, for example: \`/shuffle\` \
    \`${CUSTOM_DECK_TYPE}\` \`2 of Spades, 3 of Spades, 4 of Spades, Ace of Spades\`.`
  }
  let deckText = customCards.trim()
  if (!deckText) {
    throw nws`Please specify your custom deck, for example: \`/shuffle\` \
    \`${CUSTOM_DECK_TYPE}\` \`2 of Spades, 3 of Spades, 4 of Spades, Ace of Spades\`.`
  }
  if (deckText.indexOf(CARD_SEPARATOR) === -1) {
    throw nws`Your custom deck has only one card, please provide more than one, for \
    example: \`/shuffle\` \`${CUSTOM_DECK_TYPE}\` \`2 of Spades, 3 of Spades, 4 of Spades, \
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
    than one, for example: \`/shuffle\` \`${CUSTOM_DECK_TYPE}\` \`2 of Spades, 3 of Spades, \
    4 of Spades, Ace of Spades\`.`
  }

  return _.shuffle(cards)
}

const getAndProcessDeckFromDb = async (deckId) => {
  try {
    const deckDbResult = await getDeckFromDb(deckId)
    return shuffleDeckDbResult(deckDbResult, deckId)
  } catch (error) {
    throw error
  }
}

const getDeckFromDb = async (deckId) => {
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
    throw nws`Failed to get the deck. Please contact the bot author.`
  }
}

const shuffleDeckDbResult = async (deckDbResult, deckId) => {
  if (!deckDbResult || !deckDbResult.deck) {
    throw nws`No deck type \`${deckId}\` exists. You could list all existing deck \
        types by using the \`/listDeckTypes\` command.`
  }
  try {
    return _.shuffle(JSON.parse(deckDbResult.deck))
  } catch (error) {
    logger.error(`Failed to parse ${deckId} deck for shuffle`, error)
    throw `Failed to get the deck. Please contact the bot author.`
  }
}

const saveShuffledDeck = async (interaction, deckId, deck) => {
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
        channelIdValue: interaction.channelId,
        deckValue: JSON.stringify(deck),
        typeValue: deckId,
        timestamp: DECKS_COLUMNS.timestamp
      })
    return nws`Your \`${deckId}\` deck was shuffled!\nPlease be aware that this saved deck \
      will expire and be automatically deleted after ${DECKS_EXPIRE_AFTER} of last being \
      drawn from.`
  } catch(error) {
    logger.error(nws`Failed to update the deck for channel ${interaction.channelId}`, error)
    throw `Failed to save the deck. Please contact the bot author.`
  }
}