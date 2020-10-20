const _ = require('underscore');
const constants = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler');

module.exports = async (args) => {
  let deckId = constants.DEFAULT_DECK_TYPE;
  if (args.commandText.trim()) {
    deckId = args.commandText.trim().toLowerCase();
  }
  await processShuffleCommand(args.message, deckId, args.prefix);
};

const processShuffleCommand = async (message, deckId, prefix) => {
  try {
    const result = await pg.one(constants.DECK_TYPES_DB_NAME, `WHERE id = '${deckId}'`,
      constants.DECK_TYPES_COLUMNS.deck);

    const deck = _.shuffle(JSON.parse(result.deck));
    try {
      await pg.upsert(
        constants.DECKS_DB_NAME,
        constants.DECKS_COLUMNS.channel_id,
        [constants.DECKS_COLUMNS.deck, constants.DECKS_COLUMNS.type_id],
        message.channel.id,
        [JSON.stringify(deck), deckId]);
      return message.reply('Your `' + deckId + '` deck was shuffled!');
    } catch(error) {
      console.error('ERROR: Failed to update the deck for channel "' +
        message.channel.id + '", ' + error);
      return message.reply('**ERROR:** Failed to save the deck.')
        .catch(console.error);
    }
  } catch (error) {
    return message.reply('**ERROR:** No deck type `' + deckId + '` exists. ' +
      'List all existing deck types via the `' + prefix + 'listDeckTypes` command.')
      .catch(console.error);
  }
};