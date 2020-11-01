const _ = require('underscore')
const {
  DEFAULT_DECK_TYPE,
  DECK_TYPES_DB_NAME,
  DECK_TYPES_COLUMNS,
  DECKS_DB_NAME,
  DECKS_COLUMNS,
  ERROR_PREFIX,
  DECKS_EXPIRE_AFTER
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const nws = require('../helpers/nws')
const reply = require('../helpers/reply')
const logger = require('../helpers/logger')

module.exports = async (args) => {
  let deckId = DEFAULT_DECK_TYPE;
  if (args.commandText.trim()) {
    deckId = args.commandText.trim().toLowerCase()
  }
  await processShuffleCommand(args.message, deckId, args.prefix)
};

const processShuffleCommand = async (message, deckId, prefix) => {
  try {
    const result = await pg.db.oneOrNone(
      'SELECT ${deck~} FROM ${db#} WHERE ${deckId~} = ${deckIdValue}',
      {
        deck: DECK_TYPES_COLUMNS.deck,
        db: pg.addPrefix(DECK_TYPES_DB_NAME),
        deckId: DECK_TYPES_COLUMNS.id,
        deckIdValue: deckId
      }
    )
    if (!result || !result.deck) {
      return reply(nws`No deck type \`${deckId}\` exists. You could list all existing deck \
        types by using the \`${prefix}listDeckTypes\` command.`, message)
    }

    let deck = []
    try {
      deck = _.shuffle(JSON.parse(result.deck))
    } catch (error) {
      logger.error(`Failed to parse ${deckId} deck for shuffle`, error)
      return reply(`${ERROR_PREFIX}Failed to get the deck. Please contact the bot author.`,
        message)
    }
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
      return reply(nws`Your \`${deckId}\` deck was shuffled!\nPlease be aware that this saved deck \
        will expire and be automatically deleted after ${DECKS_EXPIRE_AFTER} of last being \
        drawn from.`, message)
    } catch(error) {
      logger.error(nws`Failed to update the deck for channel ${message.channel.id}`, error)
      return reply(`${ERROR_PREFIX} Failed to save the deck.`, message)
    }
  } catch (error) {
    return reply(nws`${ERROR_PREFIX} No deck type \`${deckId}\` exists. \
      'You can list all existing deck types via the \`'${prefix}listDeckTypes\` command.`, message)
  }
};