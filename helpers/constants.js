module.exports.POKER_DECK = [
    '2\u2661', '3\u2661', '4\u2661', '5\u2661', '6\u2661', '7\u2661', '8\u2661', '9\u2661', '10\u2661',
    'J\u2661', 'Q\u2661', 'K\u2661', 'A\u2661',
    '2\u2662', '3\u2662', '4\u2662', '5\u2662', '6\u2662', '7\u2662', '8\u2662', '9\u2662', '10\u2662',
    'J\u2662', 'Q\u2662', 'K\u2662', 'A\u2662',
    '2\u2667', '3\u2667', '4\u2667', '5\u2667', '6\u2667', '7\u2667', '8\u2667', '9\u2667', '10\u2667',
    'J\u2667', 'Q\u2667', 'K\u2667', 'A\u2667',
    '2\u2664', '3\u2664', '4\u2664', '5\u2664', '6\u2664', '7\u2664', '8\u2664', '9\u2664', '10\u2664',
    'J\u2664', 'Q\u2664', 'K\u2664', 'A\u2664',
    'Joker(R)', 'Joker(B)'
];
module.exports.DEFAULT_DECK_TYPE = 'poker';
module.exports.DECK_TYPES_DB_NAME = 'deck_types';
module.exports.DECK_TYPES_COLUMNS = { id: 'id', deck: 'deck', description: 'description' };

module.exports.DECKS_DB_NAME = 'decks';
module.exports.DECKS_COLUMNS = { channel_id: 'channel_id', deck: 'deck', type_id: 'type_id' };