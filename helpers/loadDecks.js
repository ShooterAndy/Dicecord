const pgHandler = require('./pgHandler');
const _ = require('underscore');
const dbName = 'decks';

module.exports = () => {
    return new Promise((resolve, reject) => {
        pgHandler.selectFromDB(dbName).then((data) => {
            let decks = {};
            _.each(data, (item) => {
                let values = _.values(item);
                decks[values[0]] = JSON.parse(values[1]);
            });
            resolve(decks);
        }, (error) => {
            reject(error);
        });
    });
};