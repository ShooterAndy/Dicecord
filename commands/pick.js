const random = require('random');
const _ = require('underscore');
const choicesMinimum = 2;
const choicesMaximum = 1000;

module.exports = args => {
    if(!args.commandText) {
        return args.message.reply('**ERROR:** no choices to pick from. Please input something like this:\n' +
            '`' + args.prefix + 'pick One choice, Another choice, ...`, or check out `' + args.prefix +
            'help pick` for more info').catch(console.error);
    }
    const choiceParts = args.commandText.split(',');
    if(choiceParts.length < choicesMinimum) {
        return args.message.reply('**ERROR:** not enough choices to pick from. Please provide at least ' +
            choicesMinimum + '.')
            .catch(console.error);
    }
    if(choiceParts.length > choicesMaximum) {
        return args.message.reply('**ERROR:** too many choices to pick from, please input less than ' +
            choicesMaximum + '.')
            .catch(console.error);
    }
    let choices = [];
    _.each(choiceParts, function(choice) {
        let trimmedChoice = choice.trim();
        if(trimmedChoice.length) {
            choices.push(trimmedChoice);
        }
    });
    if(choices.length < choicesMinimum) {
        return args.message.reply('**ERROR:** not enough actual choices to pick from, please provide at least ' +
            choicesMinimum + '.').catch(console.error);
    }

    return args.message.reply(choices[random.integer(0, choices.length - 1)]).catch(console.error);
};