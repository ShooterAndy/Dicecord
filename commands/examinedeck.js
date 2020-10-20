const pg = require('../helpers/pgHandler');
const constants = require('../helpers/constants');

module.exports = async (args) => {
  const firstArg = args.commandText.trim().split(' ')[0].toLowerCase();
  let deckId = firstArg;
  let shouldShowCards = false;
  if (firstArg === '-full') {
    shouldShowCards = true;
    deckId = args.commandText.trim().slice(firstArg.length).trim();
  }
  try {
    const result = await pg.oneOrNone(
      constants.DECK_TYPES_DB_NAME,
      `WHERE id = '${deckId}'`,
      constants.DECK_TYPES_COLUMNS.description +
      (shouldShowCards ? (',' + constants.DECK_TYPES_COLUMNS.deck) : '')
    );
    if (!result) throw new Error('empty response from the database');

    if (!result) {
      return args.message.reply('**ERROR:** No deck `' + deckId + '` exists.')
        .catch(console.error);
    }
    let text = '`' + deckId + '`:\n> ' + result.description + '\n';
    if (shouldShowCards) {
      text += '\n Cards in this deck:\n > ' + JSON.parse(result.deck).join(', ') + '\n';
    } else {
      text += 'You can see the full deck by using the `' + args.prefix + 'examineDeck -full ' +
        deckId + '`';
    }
    return args.message.reply(text)
      .catch(console.error);
  } catch (error) {
    console.error('ERROR: Failed to get the info for deck "' + deckId + '":\n' + error);
    return args.message.reply('**ERROR:** Failed to get the information about this deck.')
      .catch(console.error);
  }
};