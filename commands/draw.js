const _ = require('underscore')
const pg = require('../helpers/pgHandler')
const {
  DECKS_DB_NAME,
  DECKS_COLUMNS,
  ERROR_PREFIX
} = require('../helpers/constants')
const reply = require('../helpers/reply')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')

module.exports = async (args) => {
  const numberOfCardsToDraw = args.commandText.trim().split(' ')[0]
  const comment = args.commandText.trim().slice(numberOfCardsToDraw.length).trim()
  const verb = args.verb || 'draw'
  await processDrawCommand(args.message, numberOfCardsToDraw, comment, verb)
};

const processDrawCommand = async (message, numberOfCardsToDraw, comment, verb) => {
  let text = '';
  const pastVerb = verb === 'deal' ? 'dealt' : 'drew'
  if (isNaN(numberOfCardsToDraw) || numberOfCardsToDraw < 1) {
    return reply(nws`${ERROR_PREFIX}${numberOfCardsToDraw} is not a valid number of cards to \
      ${verb}.`, message)
  }
  else {
    numberOfCardsToDraw = parseInt(numberOfCardsToDraw)

    try {
      const result = await pg.one(
        DECKS_DB_NAME,
        `WHERE ${DECKS_COLUMNS.channel_id} = '${message.channel.id}'`,
        DECKS_COLUMNS.deck
      )

      if (!result || !result[DECKS_COLUMNS.deck]) {
        return reply(nws`${ERROR_PREFIX}Couldn't find a deck for this channel. Please \
          \`!shuffle\` one first.`, message)
      }
      let deck = []
      try {
        deck = JSON.parse(result[DECKS_COLUMNS.deck]);
      } catch (error) {
        logger.error(nws`Failed to parse the deck for channel "${message.channel.id}"`, error)
        return reply(nws`${ERROR_PREFIX}Failed to process the deck. Please contact the bot author`,
          message)
      }

      if (deck.length < numberOfCardsToDraw) {
        return reply(nws`${ERROR_PREFIX}Not enough cards left in the deck (requested \
          ${numberOfCardsToDraw}, but only ${deck.length} cards left). Reshuffle (by using \
          \`!shuffle\`) or ${verb} fewer cards.`, message)
      } else {
        let drawnCards = deck.slice(0, numberOfCardsToDraw)
        deck = deck.slice(numberOfCardsToDraw)
        let cardOrCards = 'cards'
        if (numberOfCardsToDraw === 1) {
          cardOrCards = 'card'
        }
        text = 'You ' + pastVerb + ' ' + numberOfCardsToDraw + ' ' + cardOrCards +
          ' from the deck (' + deck.length + ' left): '
        if (comment) {
          text += '\n`' + comment + ':`'
        }
        text += drawnCards.join(', ') + '.'

        try {
          await pg.upsert(
            DECKS_DB_NAME,
            DECKS_COLUMNS.channel_id,
            [DECKS_COLUMNS.deck],
            message.channel.id,
            [JSON.stringify(deck)])
          return reply(text, message)
        } catch (error) {
          logger.error(nws`Failed to update the deck for channel "${message.channel.id}"`, error)
          return reply(`${ERROR_PREFIX}Failed to save the deck.`, message)
        }
      }
    } catch(error) {
      logger.error(`Failed to get the deck for channel "${message.channel.id}"`, error)
    }
  }
};
