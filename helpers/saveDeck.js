const pgHandler = require('./pgHandler');
const dbName = 'decks';
const columnNames = ["channel_id", "deck"];

module.exports = (args) => {
    return new Promise((resolve, reject) => {
        pgHandler.insertIntoDB(dbName, columnNames,
            [args.message.channel.id, JSON.stringify(args.deck)]).then(() => {
            resolve();
        }, (error) => {
            reject(error);
        });
    });
};