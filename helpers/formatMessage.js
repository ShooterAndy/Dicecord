const _ = require('underscore');

module.exports = args => {
    const channel = args.message.channel;
    let clientChannels = '';
    _.each(args.client.channels.array(), (channel) => {
        clientChannels += channel.id + ', ';
    });
    channel.fetchMessages().then(messages => {
        const messagesArray = _.sortBy(messages.array(), (message) => { return -message.createdTimestamp; });
        let rollMessage = null;
        for(let i = 0; i < messagesArray.length; i++) {
            if (messagesArray[i].author.id === args.client.user.id) {
                if((messagesArray.length > i + 1) &&
                    messagesArray[i + 1] && messagesArray[i + 1].content.trim().toLowerCase().startsWith('!r')) {
                    rollMessage = messagesArray[i];
                    break;
                }
            }
        }
        if(!rollMessage) {
            args.message.reply('could not find the last roll message.');
        }
        else {
            processMessage(args, rollMessage, args.formatting);
        }
    }).catch(console.error);
};

const processMessage = function(args, lastMessage, formatting) {
    let boldStart, boldEnd, italicsStart, italicsEnd, listStart, listEnd, listItemStart, listItemEnd, codeStart,
        codeEnd, replaceLinebreaks, multipleListStarts;
    switch(formatting) {
        case 'bbcode': {
            boldStart = '[b]';
            boldEnd = '[/b]';
            italicsStart = '[i]';
            italicsEnd = '[/i]';
            listStart = '[ul]';
            listEnd = '[/ul]';
            listItemStart = '[li]';
            listItemEnd = '[/li]';
            codeStart = '';
            codeEnd = '';
            replaceLinebreaks = true;
            multipleListStarts = false;
            break;
        }
        case 'markdown': {
            boldStart = '**';
            boldEnd = '**';
            italicsStart = '_';
            italicsEnd = '_';
            listStart = '';
            listEnd = '';
            listItemStart = ' * ';
            listItemEnd = '';
            codeStart = '';
            codeEnd = '';
            replaceLinebreaks = false;
            multipleListStarts = true;
            break;
        }
    }
    if(!lastMessage || !lastMessage.content) {
        return args.message.reply('**ERROR:** No last message found').catch(console.error);
    }
    const indexOfComma = lastMessage.content.indexOf(',');
    if(indexOfComma < 1) {
        return args.message.reply('**ERROR:** The last message has non-typical format').catch(console.error);
    }
    let message = lastMessage.content.slice(indexOfComma + 2);

    message = message.replace(/ {2}/gm, ' ');
    message = message.replace(/`(.*?(?:`|$))/gm, codeStart + '$1').replace(/`/gm, codeEnd);

    message = message.replace(/_(.*?(?:_|$))/gm, italicsStart + '$1').replace(/_/gm, italicsEnd);
    message = message.replace(/\*\*(.*?(?:\*\*|$))/gm, boldStart + '$1').replace(/\*\*/gm, boldEnd);

    const indexOfListStart = message.indexOf('\n * Roll ');
    if(indexOfListStart >= 0) {
        const messageParts = message.split(' * Roll');
        if(messageParts.length > 1) {
            const indexOfListEnd = messageParts[messageParts.length - 1].indexOf('\n');
            messageParts[0] = messageParts[0].slice(indexOfListStart);
            messageParts[messageParts.length - 1] = messageParts[messageParts.length - 1].slice(0, indexOfListEnd);
            let messagePartsLength = 0;
            for(let i = 0; i < messageParts.length - 1; i++) {
                messagePartsLength += messageParts[i].length + 7;
            }
            let AoEmessage = '';
            _.each(messageParts, function (messagePart, i) {
                if(messagePart.trim().length > 0) {
                    if(i > 0) {
                        const indexOfLineEnd = messagePart.indexOf('\n');
                        AoEmessage += listItemStart + 'Roll' +
                            (indexOfLineEnd === -1 ? messagePart : messagePart.slice(0, indexOfLineEnd));
                        if(i === messageParts.length - 1) {
                            AoEmessage += listItemEnd + listEnd;
                        }
                        else {
                            AoEmessage += listItemEnd;
                        }
                    }
                    else {
                        AoEmessage += messagePart;
                    }
                }
            });

            if(indexOfListEnd !== -1) {
                message = message.slice(0, indexOfListStart) + listStart + AoEmessage +
                    message.slice(indexOfListStart + messagePartsLength + indexOfListEnd);
            }
            else {
                message = message.slice(0, indexOfListStart) + listStart + AoEmessage;
            }
        }
    }

    message = message.slice(1);
    if(replaceLinebreaks) {
        if(message.lastIndexOf('\n') > 0) {
            message = listStart + listItemStart + message.replace(/\n/gm, listItemEnd + listItemStart);
            message += listItemEnd + listEnd;
        }
    }
    else {
        if(message.lastIndexOf('\n') > 0) {
            message = message.split(listItemStart).join('\n' + listItemStart);
            message = listStart + listItemStart + message.replace(/\n/gm, '\n' + listItemEnd + listItemStart);
            message = message.split(listItemStart + listItemStart).join('\t' + listItemStart);
        }
        else {
            message = message.split(listItemStart).join('\n' + listItemStart);
        }
    }

    return args.message.reply('Last message formatted for ' + formatting + ':\n```' + message + '```')
        .catch(console.error);
};