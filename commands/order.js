const random = require('random');
const _ = require('underscore');
const minimumNumber = 2;
const maximumNumber = 1000;

module.exports = args => {
    if(!args.commandText) {
        return args.message.reply('**ERROR:** no items to order. Please input something like this:\n' +
            '`' + args.prefix + 'order First item, Another item, ...`, or check out `' + args.prefix +
            'help order` for more info').catch(console.error);
    }

    let commandText = args.commandText;
    let list = -1;
    if(commandText.trim().indexOf('-ul ') === 0) {
        list = 0;
        commandText = commandText.slice(commandText.indexOf('-ul ') + 4);
    }
    else if(commandText.trim().indexOf('-ol ') === 0) {
        list = 1;
        commandText = commandText.slice(commandText.indexOf('-ol ') + 4);
    }

    const choiceParts = commandText.split(',');
    if(choiceParts.length < minimumNumber) {
        return args.message.reply('**ERROR:** not enough items to order, please provide at least ' + minimumNumber +
            '.').catch(console.error);
    }
    if(choiceParts.length > maximumNumber) {
        return args.message.reply('**ERROR:** too many items to order, please input less than ' + maximumNumber + '.')
            .catch(console.error);
    }
    let choices = [];
    _.each(choiceParts, function(choice) {
        let trimmedChoice = choice.trim();
        if(trimmedChoice.length) {
            choices.push(trimmedChoice);
        }
    });
    if(choices.length < minimumNumber) {
        return args.message.reply('ERROR: not enough actual items to order, please provide at least ' + minimumNumber +
            '.').catch(console.error);
    }

    let choicesString = '';
    _.each(_.shuffle(choices), (choice, i) =>  {
        if(list === -1) {
            choicesString += choice + (i === choices.length - 1 ? '' : ', ');
        }
        else if(list === 0) {
            choicesString += '* ' + choice + '\n';
        }
        else {
            choicesString += (i + 1) + '. ' + choice + '\n';
        }
    });

    return args.message.reply('Your list of items, randomly ordered:\n```' + choicesString + '```')
        .catch(console.error);
};