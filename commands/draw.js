const _ = require('underscore');
const pg = require('../helpers/pgHandler');
const dbName = 'decks';
const idColumnName = 'channel_id';
const dataColumnName = 'deck';

module.exports = async (args) => {
  const numberOfCardsToDraw = args.commandText.trim().split(' ')[0];
  const comment = args.commandText.trim().slice(numberOfCardsToDraw.length).trim();
  const verb = args.verb || 'draw';
  await processDrawCommand(args.message, numberOfCardsToDraw, comment, verb);
};

const processDrawCommand = async (message, numberOfCardsToDraw, comment, verb) => {
  let text = '';
  const pastVerb = verb === 'deal' ? 'dealt' : 'drew';
  if (isNaN(numberOfCardsToDraw) || numberOfCardsToDraw < 1) {
    return message.reply('**ERROR:** "' + numberOfCardsToDraw +
      '" is not a valid number of cards to ' + verb + '.')
      .catch(console.error);
  }
  else {
    numberOfCardsToDraw = parseInt(numberOfCardsToDraw);

    try {
      const result = await pg.one(
        dbName, `WHERE ${idColumnName} = '${message.channel.id}'`, dataColumnName);

      if (!result || !result[dataColumnName]) {
        return message.reply('**ERROR:** Couldn\'t find a deck for this channel. ' +
          'Please `!shuffle` one first.').catch(console.error);
      }
      let deck = [];
      try {
        deck = JSON.parse(result[dataColumnName]);
      } catch (error) {
        console.error('ERROR: Failed to parse the deck for channel "' +
          message.channel.id + '", ' + error);
        return message.reply('**ERROR:** Failed to process the deck.')
          .catch(console.error);
      }

      if (deck.length < numberOfCardsToDraw) {
        return message.reply('**ERROR:** Not enough cards left in the deck (requested ' +
          numberOfCardsToDraw + ', but only ' + deck.length +
          ' cards left). Reshuffle (by using `!shuffle`) or ' + verb + ' fewer cards.')
          .catch(console.error);
      } else {
        let drawnCards = deck.slice(0, numberOfCardsToDraw);
        deck = deck.slice(numberOfCardsToDraw);
        text = 'You ' + pastVerb + ' ' + numberOfCardsToDraw +
          ' cards from the deck (' + deck.length + ' left): ';
        if (comment) {
          text += '\n`' + comment + ':`';
        }
        text += drawnCards.join(', ') + '.';

        try {
          await pg.upsert(
            'decks',
            'channel_id',
            ['deck'],
            message.channel.id,
            [JSON.stringify(deck)]);
          return message.reply(text).catch(console.error);
        } catch (error) {
          console.error('ERROR: Failed to update the deck for channel "' +
            message.channel.id + '", ' + error);
          return message.reply('**ERROR:** Failed to save the deck.')
            .catch(console.error);
        }
      }
    } catch(error) {
      console.error(error);
    }
  }
};
