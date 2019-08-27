const _ = require('underscore');
const maxPrefixLength = 8;
const Prefixes = require('../helpers/prefixes');

module.exports = args => {
    if(!args.message.member.hasPermission('ADMINISTRATOR')) {
        return args.message.reply('**ERROR:** only a guild administrator can change the prefix for this guild.')
            .catch(console.error);
    }

    if(!args.commandText || args.commandText.trim().length === 0) {
        return args.message.reply('**ERROR:** no prefix specified. Please input something like this:\n' +
            '`' + args.prefix + 'setprefix `, or check out `' + args.prefix + 'help setprefix` for more info')
            .catch(console.error);
    }

    const suggestedPrefix = args.commandText.trim();

    if(suggestedPrefix.length > maxPrefixLength) {
        return args.message.reply('**ERROR:** please provide a prefix that is shorter than ' + maxPrefixLength +
            ' symbols.').catch(console.error);
    }

    if(suggestedPrefix.indexOf('/\s/g') !== -1) {
        return args.message.reply('**ERROR:** the prefix can\'t have any white-space symbols in it.')
    }

    if(suggestedPrefix.startsWith('/')) {
        return args.message.reply('**ERROR:** the prefix can\'t start with the Discord-reserved symbol `/`.')
    }

    if(suggestedPrefix.indexOf('#') !== -1 ||
        suggestedPrefix.indexOf('@') !== -1 ||
        suggestedPrefix.indexOf('*') !== -1 ||
        suggestedPrefix.indexOf('_') !== -1 ||
        suggestedPrefix.indexOf('~') !== -1 ||
        suggestedPrefix.indexOf('`') !== -1 ||
        suggestedPrefix.indexOf(':') !== -1 ||
        suggestedPrefix.indexOf('\'') !== -1 ||
        suggestedPrefix.indexOf('"') !== -1 ||
        suggestedPrefix.indexOf('||') !== -1) {
        return args.message.reply('**ERROR:** the prefix can\'t have quotation marks and the Discord-reserved symbols '
            + '`@`, `#`, `*`, `_`, `~`, `:`, or `||` (as well as the backtick).')
    }

    Prefixes.set(args.message.guild.id, suggestedPrefix).then(() => {
        return args.message.reply('Prefix successfully set to `' + suggestedPrefix + '`.')
            .catch(console.error);
    }, (err) => {
        console.error('Couldn\'t save the prefixes file: ' + err);
        return args.message.reply('**ERROR:** Couldn\'t save the prefixes file.')
            .catch(console.error);
    });
};