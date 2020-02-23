const _ = require('underscore');
const constants = require('../helpers/constants.js')

module.exports = args => {
    const numberOfCardsToDraw = args.commandText.trim().split(' ')[0];
    const comment = args.commandText.trim().slice(numberOfCardsToDraw.length).trim();
    processDrawShuffledCommand(args.message, numberOfCardsToDraw, comment);
};

const processDrawShuffledCommand = function (message, numberOfCardsToDraw, comment) {
    let text = '';
    if (isNaN(numberOfCardsToDraw)) {
        return message.reply('**ERROR:** "' + numberOfCardsToDraw + '" is not a valid number of cards to draw.')
            .catch(console.error);
    }
    else {
        numberOfCardsToDraw = parseInt(numberOfCardsToDraw);
        if (numberOfCardsToDraw > constants.POKER_DECK.length) {
            return message.reply('**ERROR:** Not enough cards in the deck (requested ' +
                numberOfCardsToDraw +
                ', but only ' + constants.POKER_DECK.length + ' cards in the deck). Please draw fewer cards.')
                .catch(console.error);
        }
        else {
            const deck = _.shuffle(JSON.parse(JSON.stringify(constants.POKER_DECK)));
            let drawnCards = deck.slice(0, numberOfCardsToDraw);
            text = 'Here are your ' + numberOfCardsToDraw + ' cards: ';
            if (comment) {
                text += '\n`' + comment + ':` ';
            }
            _.each(drawnCards, function(card) {
                text += card + ', ';
            });
            text = text.slice(0, -2) + '.';
            return message.reply(text).catch(console.error);
        }
    }
};