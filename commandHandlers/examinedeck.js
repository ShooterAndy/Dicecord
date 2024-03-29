const pg = require('../helpers/pgHandler')
const {
  DECK_TYPES_DB_NAME,
  DECK_TYPES_COLUMNS, PRIMARY_COLOR, ICON_URL
} = require('../helpers/constants')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const errorEmbed = require('../helpers/errorEmbed')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')

module.exports = async (interaction, args) => {
  const { deckId, shouldShowCards } = args
  try {
    if (!deckId) {
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Please enter the name of the \
        deck you wish to examine, for example: \`poker-color\`. You can see the available deck \
        types via the \`/listDeckTypes\` command.`))

    }
    let result
    if (shouldShowCards) {
      result = await pg.db.oneOrNone(
        'SELECT ${description~},${deck~} FROM ${db#} WHERE ${deckId~} = ${deckIdValue}',
        {
          description: DECK_TYPES_COLUMNS.description,
          deck: DECK_TYPES_COLUMNS.deck,
          db: pg.addPrefix(DECK_TYPES_DB_NAME),
          deckId: DECK_TYPES_COLUMNS.id,
          deckIdValue: deckId
        }
      )
    } else {
      result = await pg.db.oneOrNone(
        'SELECT ${description~} FROM ${db#} WHERE ${deckId~} = ${deckIdValue}',
        {
          description: DECK_TYPES_COLUMNS.description,
          db: pg.addPrefix(DECK_TYPES_DB_NAME),
          deckId: DECK_TYPES_COLUMNS.id,
          deckIdValue: deckId
        }
      )
    }

    if (!result || !result.description) {
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`No deck type \`${deckId}\` \
        exists. You can see all of the existing deck types via the \`/listDeckTypes\` command.`))
    }
    let text = result.description + '\n'
    if (shouldShowCards) {
      try {
        text += '\n Cards in this deck:\n > ' + JSON.parse(result.deck).join(', ') + '\n'
      } catch (error) {
        logger.error(`Failed to parse "${deckId}" deck`, error)
        return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to parse the deck. \
          Please contact the author of this bot.`))
      }
    } else {
      text +=
        'You can see the full deck by using the `list_cards` optional parameter for this command.'
    }
    try {
      return await replyOrFollowUp(interaction,
        commonReplyEmbed.get(`Information about the "${deckId}" deck type:`, text))
    } catch (error) {
      logger.error('Failed to reply in /examineDeck handler', error)
      return null
    }
  } catch (error) {
    logger.error(`Failed to get the info for deck "${deckId}"`, error)
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to get the information \
      about this deck. Please contact the author of this bot.`))
  }
};