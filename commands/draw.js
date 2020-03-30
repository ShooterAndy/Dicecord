const saveDeck = require('../helpers/saveDeck');
const loadDecks = require('../helpers/loadDecks.js');
const _ = require('underscore');

module.exports = args => {
    const numberOfCardsToDraw = args.commandText.trim().split(' ')[0];
    const comment = args.commandText.trim().slice(numberOfCardsToDraw.length).trim();
    processDrawCommand(args.message, numberOfCardsToDraw, comment);
};

const processDrawCommand = function (message, numberOfCardsToDraw, comment) {
    let text = '';
    if (isNaN(numberOfCardsToDraw) || numberOfCardsToDraw < 1) {
        return message.reply('**ERROR:** "' + numberOfCardsToDraw + '" is not a valid number of cards to draw.')
            .catch(console.error);
    }
    else {
        numberOfCardsToDraw = parseInt(numberOfCardsToDraw);
        loadDecks().then((result) => {
            if(result[message.channel.id]) {
                let deck = JSON.parse(JSON.stringify(result[message.channel.id]));

                if (deck.length < numberOfCardsToDraw) {
                    return message.reply('**ERROR:** Not enough cards left in the deck (requested ' +
                        numberOfCardsToDraw +
                        ', but only ' + deck.length + ' cards left). Reshuffle or draw fewer cards.')
                        .catch(console.error);
                }
                else {
                    let drawnCards = deck.slice(0, numberOfCardsToDraw);
                    deck = deck.slice(numberOfCardsToDraw);
                    text = 'You drew ' + numberOfCardsToDraw + ' cards from the deck (' + deck.length + ' left): ';
                    if (comment) {
                        text += '\n`' + comment + ':`';
                    }
                    _.each(drawnCards, function(card) {
                        text += card + ', ';
                    });
                    text = text.slice(0, -2) + '.';
                    saveDeck({ deck: deck, message: message }).then(() => {
                        return message.reply(text).catch(console.error);
                    }, (error) => {
                        console.error('ERROR: Failed to update the deck for channel "' + message.channel.id + '", ' +
                            error);
                        return message.reply('**ERROR:** Failed to save the deck.').catch(console.error);
                    });
                }
            }
            else {
                return message.reply('**ERROR:** No deck found for this channel. Shuffle the deck first!')
                    .catch(console.error);
            }
        }, (error) => {
            console.error('ERROR: Failed to get the deck for channel "' + message.channel.id + '", ' + error);
            return message.reply('**ERROR:** Failed to get the deck.').catch(console.error);
        });
    }
};
