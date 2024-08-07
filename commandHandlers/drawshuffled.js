const _ = require('underscore')
const {
  DEFAULT_DECK_TYPE,
  DECK_TYPES_DB_NAME,
  DECK_TYPES_COLUMNS,
  DISCORD_CODE_REGEX
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const errorEmbed = require('../helpers/errorEmbed')
const saveableReplyEmbed = require('../helpers/saveableReplyEmbed')
const genericCommandSaver = require('../helpers/genericCommandSaver')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')
const {CUSTOM_DECK_TYPE, DECKS_COLUMNS, DECKS_DB_NAME} = require('../helpers/constants')

module.exports = async (interaction, args) => {
  const { numberOfCardsToDraw } = args
  let { deck, comment } = args
  if (!deck) deck = DEFAULT_DECK_TYPE
  if (comment) {
    comment = comment.replace(DISCORD_CODE_REGEX, '').trim()
  }
  await processDrawShuffledCommand(interaction, numberOfCardsToDraw, deck, comment)
};

const processDrawShuffledCommand =
  async (interaction, numberOfCardsToDraw, deckId, comment) => {
    if (!numberOfCardsToDraw) {
      numberOfCardsToDraw = 1
    }
    if (numberOfCardsToDraw < 1) {
      return await replyOrFollowUp(interaction, errorEmbed.get(`Can't draw less than one card.`))
    }

    let result
    try {
      if (deckId === CUSTOM_DECK_TYPE) {
        result = await pg.db.oneOrNone(
          'SELECT ${deck~} FROM ${db#} WHERE ${channelId~} = ${channelIdValue}',
          {
            deck: DECKS_COLUMNS.deck,
            db: pg.addPrefix(DECKS_DB_NAME),
            channelId: DECKS_COLUMNS.channel_id,
            channelIdValue: interaction.channelId
          })
      } else {
        result = await pg.db.oneOrNone(
          'SELECT ${deck~} FROM ${db#} WHERE ${deckId~} = ${deckIdValue}',
          {
            deck: DECK_TYPES_COLUMNS.deck,
            db: pg.addPrefix(DECK_TYPES_DB_NAME),
            deckId: DECK_TYPES_COLUMNS.id,
            deckIdValue: deckId
          })
      }
    } catch (error) {
      logger.error(`Failed to load the "${deckId}" deck for the "/drawShuffled" command`, error)
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to load the deck. \
        Please contact the author of this bot.`))
    }
    if (!result || !result.deck) {
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`No deck type \`${deckId}\` \
        exists. You can see all the existing deck types via the \`/listDeckTypes\` command.`))
    }

    let parsedDeck
    try {
      parsedDeck = JSON.parse(result.deck)
    } catch (error) {
      logger.error(`Failed to parse the "${deckId}" deck`, error)
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to parse the deck. \
        Please contact the author of this bot.`))
    }
    let shuffledDeck = _.shuffle(parsedDeck)
    if (numberOfCardsToDraw > parsedDeck.length) {
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Not enough cards in the deck \
      (requested ${numberOfCardsToDraw}, but the deck only has ${parsedDeck.length} cards in \
      it. Please draw fewer cards.`))
    }
    else {
      let text
      let drawnCards = shuffledDeck.slice(0, numberOfCardsToDraw)
      let isOrAre = ' are'
      let cardOrCards = 'cards'
      if (numberOfCardsToDraw === 1) {
        isOrAre = '\'s'
        cardOrCards = 'card'
      }
      text = 'Here' + isOrAre + ' your ' + numberOfCardsToDraw + ' ' + cardOrCards + ' from '
      if (deckId !== CUSTOM_DECK_TYPE) {
        text += 'a'
      } else {
        text += 'the'
      }
      text += ' `' + deckId + '` deck: '
      if (comment) {
        text += '\n`' + (comment.endsWith(':') ? comment : (comment + ':')) + '` '
      }

      text += drawnCards.join(', ')
      const reply = saveableReplyEmbed.get('Your cards:', text)
      reply.fetchReply = true

      const r = await replyOrFollowUp(interaction, reply)
      if (!r) return null

      await genericCommandSaver.launch(interaction, r)
    }
  };