const saveDeck = require('../helpers/saveDeck');
const _ = require('underscore');
const constants = require('../helpers/constants.js')

module.exports = args => {
    processShuffleCommand(args.message);
};

const processShuffleCommand = function (message) {
    const deck = _.shuffle(JSON.parse(JSON.stringify(constants.POKER_DECK)));
    saveDeck({ deck: deck, message: message }).then(() => {
        return message.reply('Deck shuffled!');
    }, (error) => {
        console.error('ERROR: Couldn\'t save the deck: ' + error);
        return message.reply('**ERROR:** Couldn\'t save the deck.')
            .catch(console.error);
    });
};