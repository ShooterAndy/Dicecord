const fs = require('fs');

const Prefixes = module.exports = {
    prefixes: {},
    load: () => {
        return new Promise((resolve, reject) => {
            fs.readFile('./storage/prefixes.json', 'utf8', function (err, data) {
                if (!err) {
                    try {
                        Prefixes.prefixes = JSON.parse(data);
                        resolve(Prefixes.prefixes);
                    }
                    catch (e) {
                        console.log('ERROR: Couldn\'t parse the prefixes file: ' + e);
                        reject(e);
                    }
                }
            });
        });
    },
    set: (prefixes) => {
        return new Promise((resolve, reject) => {
            fs.writeFile('./storage/prefixes.json', JSON.stringify(prefixes), function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
};