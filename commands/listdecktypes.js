const pg = require('../helpers/pgHandler')
const reply = require('../helpers/reply')
const nws = require('../helpers/nws')
const {
  DECK_TYPES_DB_NAME,
  DECK_TYPES_COLUMNS,
  ERROR_PREFIX
} = require('../helpers/constants')
const logger = require('../helpers/logger')

module.exports = async (args) => {
  try {
    const result = await pg.any(
      DECK_TYPES_DB_NAME,
      `ORDER BY ${DECK_TYPES_COLUMNS.id} ASC`,
      DECK_TYPES_COLUMNS.id
    )
    if (!result || !result.length) {
      logger.error(`The list of deck types appears to be empty`)
      return reply(nws`${ERROR_PREFIX}Failed to get the list of decks. Please contact the bot \
        author.`, args.message)
    }

    let decksText = '`'
    result.forEach((deck, index) => {
      decksText += deck.id
      if (index < result.length - 1) {
        decksText += '`\n`'
      } else {
        decksText += '`'
      }
    })
    const text = nws`Here's the list of all available deck types:\n${decksText}\nYou can learn \
      more about them by using the \`${args.prefix}examineDeck\`, for example \
      \`${args.prefix}examineDeck poker\``
    return reply(text, args.message)
  } catch (error) {
    logger.error('Failed to get the list of decks', error);
    return reply(nws`${ERROR_PREFIX}Failed to get the list of decks. Please contact the bot \
      author.`, args.message)
  }
};