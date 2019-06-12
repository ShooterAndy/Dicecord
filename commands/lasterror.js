const _ = require('underscore');
const fs = require('fs');
module.exports = (args) => {
    const message = args.message;
    const client = args.client;
    if(message.author.id) {
        client.fetchApplication().then(application => {
            if(message.author.id !== application.owner.id) {
                console.error('-- > User ' + message.author.username + '#' + message.author.tag + '(' +
                    message.author.id + ') attempted to get the list of servers!');
                return message.reply('ERROR: You cannot use this command.').catch(console.error);
            }
            fs.readFile('./lastError', 'utf8', function (err, data) {
                if (err) {
                    return message.reply('Could not read the lastError file.').catch(console.error);
                }
                else {
                    if(data.length) {
                        return message.reply('\n' + data).catch(console.error);
                    }
                    else {
                        return message.reply('lastError file is empty.').catch(console.error);
                    }
                }
            });
        }).catch(console.error);
    }
};