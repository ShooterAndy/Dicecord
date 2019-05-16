const _ = require('underscore');

module.exports = args => {
    const channel = args.message.channel;
    let clientChannels = '';
    _.each(args.client.channels.array(), (channel) => {
        clientChannels += channel.id + ', ';
    });
    channel.fetchMessages().then(messages => {
        _.every(messages.array(), (message) => {
            if (message.author.id === args.client.user.id) {
                processMessage(args, message);
                return false;
            }
            return true;
        });
    }).catch(console.error);
};

const processMessage = function(args, lastMessage) {
    if(!lastMessage || !lastMessage.content) {
        return args.message.reply('ERROR: No last message found').catch(console.error);
    }
    const indexOfComma = lastMessage.content.indexOf(',');
    if(indexOfComma < 1) {
        return args.message.reply('ERROR: The last message has non-typical format').catch(console.error);
    }
    let message = lastMessage.content.slice(indexOfComma + 2);

    message = message.replace(/ {2}/gm, ' ');
    message = message.replace(/`/gm, '');

    message = message.replace(/_(.*?(?:_|$))/gm, '[i]$1').replace(/_/gm, '[/i]');
    message = message.replace(/\*\*(.*?(?:\*\*|$))/gm, '[b]$1').replace(/\*\*/gm, '[/b]');

    const indexOfListStart = message.indexOf('\n > Roll ');
    if(indexOfListStart > 0) {
        message = message.slice(0, indexOfListStart) + '[ul]' + message.slice(indexOfListStart + 1);
        messageParts = message.split(' > Roll');
        console.log(JSON.stringify(messageParts));
        if(messageParts.length > 1) {
            message = '';
            _.each(messageParts, function (messagePart, i) {
                if(messagePart.trim().length > 0) {
                    if(i > 0) {
                        const indexOfLineEnd = messagePart.indexOf('\n');
                        message += '[li]Roll' + messagePart.slice(0, indexOfLineEnd);
                        if(i === messageParts.length - 1) {
                            message += '.[/li][/ul]';
                        }
                        else {
                            message += ';[/li]';
                        }
                        message += messagePart.slice(indexOfLineEnd + 1);
                    }
                    else {
                        message += messagePart;
                    }
                }
            });
        }
    }

    if(message.indexOf('\n') > 0) {
        message = '[ul][li]' + message;
        message = message.replace(/\n/gm, '[/li][li]');
        message += '[/li][/ul]';
    }

    return args.message.reply('Last message bb-code-ified:\n```' + message + '```').catch(console.error);
};