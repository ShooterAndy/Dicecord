const fs = require('fs');

module.exports = () => {
    return new Promise((resolve, reject) => {
        fs.readFile('./storage/decks.json', 'utf8', function (err, data) {
            if (err) {
                reject('**ERROR:** Couldn\'t read the decks file: ' + err);
            }
            else {
                try {
                    const decks = JSON.parse(data);
                    if (!decks) {
                        reject('**ERROR:** decks file is empty.');
                    }
                    else {
                        resolve(decks);
                    }
                }
                catch(e) {
                    reject('**ERROR:** Couldn\'t parse the decks file: ' + e);
                }
            }
        });
    });
};