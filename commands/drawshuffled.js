const _ = require('underscore');
const constants = require('../helpers/constants.js');
const pg = require('../helpers/pgHandler');

module.exports = async (args) => {
  const numberOfCardsToDraw = args.commandText.trim().split(' ')[0];
  const secondPart = args.commandText.trim().slice(numberOfCardsToDraw.length).trim();
  let comment;
  let deckId = constants.DEFAULT_DECK_TYPE;
  if (secondPart.startsWith('?')) {
    comment = secondPart.slice(1).trim();
  } else if (secondPart) {
    deckId = secondPart.split(' ')[0];
    comment = secondPart.slice(deckId.length).trim();
    if (comment.startsWith('?')) {
      comment = comment.slice(1).trim();
    }
  }
  await processDrawShuffledCommand(args.message, numberOfCardsToDraw, deckId, comment, args.prefix);
};

const processDrawShuffledCommand = async (message, numberOfCardsToDraw, deckId, comment, prefix) => {
  if (isNaN(numberOfCardsToDraw)) {
    return message.reply('**ERROR:** "' + numberOfCardsToDraw +
      '" is not a valid number of cards to draw.')
      .catch(console.error);
  }

  try {
    const result = await pg.one(constants.DECK_TYPES_DB_NAME, `WHERE id = '${deckId}'`,
      constants.DECK_TYPES_COLUMNS.deck);

    const deck = _.shuffle(JSON.parse(result.deck));
    numberOfCardsToDraw = parseInt(numberOfCardsToDraw);
    if (numberOfCardsToDraw > constants.POKER_DECK.length) {
      return message.reply('**ERROR:** Not enough cards in the deck (requested ' +
        numberOfCardsToDraw +
        ', but only ' + constants.POKER_DECK.length +
        ' cards in the deck). Please draw fewer cards.')
        .catch(console.error);
    }
    else {
      let text = '';
      let drawnCards = deck.slice(0, numberOfCardsToDraw);
      text = 'Here are your ' + numberOfCardsToDraw + ' cards from a `' + deckId + '` deck: ';
      if (comment) {
        text += '\n`' + comment + ':` ';
      }
      _.each(drawnCards, function(card) {
        text += card + ', ';
      });
      text = text.slice(0, -2) + '.';
      return message.reply(text).catch(console.error);
    }
  } catch (error) {
    return message.reply('**ERROR:** No deck type `' + deckId + '` exists. ' +
      'List all existing deck types via the `' + prefix + 'listDeckTypes` command. ' +
      'Or did you write that as a comment? Please note that specifying the deck type is now ' +
      'required before writing a comment, so it should look like this: `' + prefix +
      'drawShuffled 3 poker ? your comment here`.')
      .catch(console.error);
  }
};