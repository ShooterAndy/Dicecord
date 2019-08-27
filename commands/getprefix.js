const Prefixes = require('../helpers/prefixes');

module.exports = args => {
    if(!args.message.guild || !args.message.guild.id) {
        return args.message.reply('**ERROR:** No Guild id recognized.')
            .catch(console.error);
    }
    return args.message.reply('Prefix for this Guild is ' +
        (Prefixes.prefixes[args.message.guild.id] ? ('`' + Prefixes.prefixes[args.message.guild.id] + '`') :
        'not specified') + '.')
        .catch(console.error);
};