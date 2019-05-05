const random = require('random');
const _ = require('underscore');

module.exports = args => {
    if(!args.commandText) {
        return args.message.reply('ERROR: no choices to pick from').catch(console.error);
    }
    const choiceParts = args.commandText.split(',');
    if(choiceParts.length < 2) {
        return args.message.reply('ERROR: not enough choices to pick from').catch(console.error);
    }
    let choices = [];
    _.each(choiceParts, function(choice) {
        let trimmedChoice = choice.trim();
        if(trimmedChoice.length) {
            choices.push(trimmedChoice);
        }
    });
    if(choices.length < 2) {
        return args.message.reply('ERROR: not enough actual choices to pick from').catch(console.error);
    }

    return args.message.reply(choices[random.integer(0, choices.length - 1)]).catch(console.error);
};