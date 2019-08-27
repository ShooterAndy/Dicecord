const pgHandler = require('../helpers/pgHandler');
const _ = require('underscore');
const dbName = 'prefixes';
const columnNames = ["guild_id", "prefix"];

const Prefixes = module.exports = {
    prefixes: {},
    load: () => {
        return new Promise((resolve, reject) => {
            pgHandler.selectFromDB(dbName).then((data) => {
                _.each(data, (item) => {
                    let values = _.values(item);
                    Prefixes.prefixes[values[0]] = values[1];
                });
                resolve(Prefixes.prefixes);
            }, (error) => {
                reject(error);
            });
        });
    },
    set: (guildId, prefix) => {
        return new Promise((resolve, reject) => {
           pgHandler.insertIntoDB(dbName, columnNames, [guildId, prefix]).then(() => {
               Prefixes.load().then((data) => {
                   Prefixes.prefixes = data;
                   resolve();
               }, (error) => {
                   console.error('Couldn\'t read the prefixes file: ' + error);
               });
           }, (error) => {
               reject(error);
           });
        });
    }
};