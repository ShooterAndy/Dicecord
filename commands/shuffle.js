const _ = require('underscore');
const constants = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler');

module.exports = async (args) => {
  await processShuffleCommand(args.message);
};

const processShuffleCommand = async (message) => {
  const deck = _.shuffle(JSON.parse(JSON.stringify(constants.POKER_DECK)));
  try {
    await pg.upsert(
      'decks',
      'channel_id',
      ['deck'],
      message.channel.id,
      [JSON.stringify(deck)]);
    return message.reply('Deck shuffled!');
  } catch(error) {
    console.error('ERROR: Failed to update the deck for channel "' +
      message.channel.id + '", ' + error);
    return message.reply('**ERROR:** Failed to save the deck.')
      .catch(console.error);
  }
};