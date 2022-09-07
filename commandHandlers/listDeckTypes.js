const nws = require('../helpers/nws')
const {  DECK_TYPES_COLUMNS, DECK_TYPES_DB_NAME } = require('../helpers/constants')
const logger = require('../helpers/logger')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')
const errorEmbed = require('../helpers/errorEmbed')
const pg = require('../helpers/pgHandler')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')

module.exports = async (interaction, args) => {
  try {
    const result = await pg.db.any(
      'SELECT ${id~} FROM ${db#} ORDER BY ${id~} ASC',
      { id: DECK_TYPES_COLUMNS.id, db: pg.addPrefix(DECK_TYPES_DB_NAME) })
    if (!result || !result.length) {
      logger.error(`The list of deck types appears to be empty`)
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to get the list of \
        decks. Please contact the author of this bot.`))
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
    const text = nws`Here's the list of all available deck types:\n${decksText}\n\nYou can learn \
      more about them by using the \`/examineDeck\` command.`
    return await replyOrFollowUp(interaction, commonReplyEmbed.get('Available Deck Types:',
      text))
  } catch (error) {
    logger.error('Failed to get the list of decks', error);
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to get the list of decks. \
      Please contact the author of this bot.`))
  }
}