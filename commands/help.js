const fs = require('fs');

module.exports = args => {
    let helpFileName = '!';
    if(args.commandText.trim().length > 0) {
        helpFileName = args.commandText.trim();
    }
    helpFileName += '.md';

    fs.readFile('./help/' + helpFileName, 'utf8', function (err, data) {
        if (err) {
            return args.message.reply('ERROR: Couldn\'t find help for "' + args.commandText.trim() + '"')
                .catch(console.error);
        }
        else {
            args.message.reply(data).catch(console.error);
        }
    });
};