const pg = require('../helpers/pgHandler');
const constants = require('../helpers/constants');

module.exports = async (args) => {
  try {
    const result = await pg.any(
      constants.DECK_TYPES_DB_NAME,
      `ORDER BY ${constants.DECK_TYPES_COLUMNS.id} ASC`,
      constants.DECK_TYPES_COLUMNS.id
    );
    if (!result || !result.length) throw new Error('empty response from the database');

    let decksText = '`';
    result.forEach((deck, index) => {
      decksText += deck.id;
      if (index < result.length - 1) {
        decksText += '`\n`';
      } else {
        decksText += '`';
      }
    });
    const text = 'Here\'s the list of all available deck types:\n' + decksText + '\n' +
      'You can learn more about them by using the `' + args.prefix + 'examineDeck`, for example `' +
      args.prefix + 'examineDeck poker`';
    return args.message.reply(text)
      .catch(console.error);
  } catch (error) {
    console.error('ERROR: Failed to get the list of decks:\n' + error);
    return args.message.reply('**ERROR:** Failed to get the list of decks.')
      .catch(console.error);
  }
};