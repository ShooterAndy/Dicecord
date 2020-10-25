const _ = require('underscore')
const {
  ERROR_PREFIX,
  THROW_RESULTS_FORMATS
} = require('./constants')
const reply = require('./reply')
const nws = require('./nws')

/*************************************************************************************************/
// NOTE: This code is no longer supported
/*************************************************************************************************/

module.exports = async args => {
  const channel = args.message.channel

  let messageId = null
  if(args.commandText.trim().length > 0) {
    messageId = args.commandText.trim()
  }
  try {
    const messages = await channel.messages.fetch()
    const messagesArray = _.sortBy(messages.array(), (message) => {
      return -message.createdTimestamp
    })
    let rollMessage = null
    for(let i = 0; i < messagesArray.length; i++) {
      if (messagesArray[i].author.id === args.client.user.id) {
        if (messageId) {
          if(messagesArray[i].id === messageId) {
            rollMessage = messagesArray[i]
            break
          }
        }
        else {
          rollMessage = messagesArray[i]
          break
        }
      }
    }
    if(!rollMessage) {
      if(messageId) {
        return reply(nws`${ERROR_PREFIX}Could not find the roll message with the requested id \
          on this channel.`, args.message)
      }
      return reply(`${ERROR_PREFIX}Could not find the last roll message.`, args.message)
      }
    else {
      processMessage(args, rollMessage, args.formatting)
    }
  } catch(error) {
    console.error(`-- > ERROR: Failed to fetch messages for channel "${channel.id}":\n${error}`)
    return reply(`${ERROR_PREFIX}Failed to get messages for this channel.`, args.message)
  }
}

const processList = (message, listStart, listEnd, listItemStart, listItemEnd) => {
  const indexOfListStart = message.indexOf(' * Roll ')
  if(indexOfListStart >= 0) {
    const messageParts = message.split(' * Roll')
    if(messageParts.length > 1) {
      const indexOfListEnd = messageParts[messageParts.length - 1].indexOf('\n')
      messageParts[0] = messageParts[0].slice(indexOfListStart)
      messageParts[messageParts.length - 1] =
        messageParts[messageParts.length - 1].slice(0, indexOfListEnd)
      let messagePartsLength = 0
      for(let i = 0; i < messageParts.length - 1; i++) {
        messagePartsLength += messageParts[i].length + 7
      }
      let AoEmessage = ''
      _.each(messageParts, function (messagePart, i) {
        if(messagePart.trim().length > 0) {
          if(i > 0) {
            const indexOfLineEnd = messagePart.indexOf('\n')
            AoEmessage += listItemStart + 'Roll' +
              (indexOfLineEnd === -1 ? messagePart : messagePart.slice(0, indexOfLineEnd))
            if(i === messageParts.length - 1) {
              AoEmessage += listItemEnd + listEnd
            }
            else {
              AoEmessage += listItemEnd
            }
          }
          else {
            AoEmessage += messagePart
          }
        }
      });

      if(indexOfListEnd !== -1) {
        message = message.slice(0, indexOfListStart) + listStart + AoEmessage +
          message.slice(indexOfListStart + messagePartsLength + indexOfListEnd)
      }
      else {
        message = message.slice(0, indexOfListStart) + listStart + AoEmessage
      }
    }
  }
  return message
}

const processMessage = (args, lastMessage, formatting) => {
  const {
    boldStart,
    boldEnd,
    italicsStart,
    italicsEnd,
    listStart,
    listEnd,
    listItemStart,
    listItemEnd,
    codeStart,
    codeEnd,
    replaceLinebreaks,
    multipleListStarts
  } = THROW_RESULTS_FORMATS[formatting]

  if(!lastMessage || !lastMessage.content) {
    return reply(`${ERROR_PREFIX}No last message found.`, args.message)
  }
  const indexOfComma = lastMessage.content.indexOf(',')
  if(indexOfComma < 1) {
    return reply(`${ERROR_PREFIX}The last message has non-typical format.`, args.message)
  }
  let message = lastMessage.content.slice(indexOfComma + 2)

  message = message.replace(/ {2}/gm, ' ')
  message = message.replace(/`(.*?(?:`|$))/gm, codeStart + '$1')
    .replace(/`/gm, codeEnd)

  message = message.replace(/_(.*?(?:_|$))/gm, italicsStart + '$1')
    .replace(/_/gm, italicsEnd)
  message = message.replace(/\*\*(.*?(?:\*\*|$))/gm, boldStart + '$1')
    .replace(/\*\*/gm, boldEnd)

  let messageParts = message.split(' rolls):\n')
  if(messageParts.length) {
    message = ''
    message += messageParts[0]
    _.each(messageParts, (messagePart, i) => {
      if(i !== 0) {
        message += ' rolls):'
        const lastIndexOfListItem =
          Math.max(messagePart.lastIndexOf(';\n'), messagePart.lastIndexOf('.'))
        let restOfMessage = ''
        if (lastIndexOfListItem !== -1) {
          restOfMessage = messagePart.slice(lastIndexOfListItem + 2)
          messagePart = messagePart.slice(0, lastIndexOfListItem + 2)
        }
        message +=
          processList(messagePart, listStart, listEnd, listItemStart, listItemEnd) + restOfMessage
      }
    });
  }

  message = message.slice(1)
  if(replaceLinebreaks) {
    if(message.lastIndexOf('\n') > 0) {
      message = listStart + listItemStart +
        message.replace(/\n/gm, listItemEnd + listItemStart)
      message += listItemEnd + listEnd
    }
  }
  else {
    if(message.lastIndexOf('\n') > 0) {
      message = message.split(listItemStart).join('\n' + listItemStart)
      message = listStart + listItemStart + message.replace(/\n/gm, '\n'
        + listItemEnd + listItemStart)
      message = message.split(listItemStart + listItemStart).join('\t' + listItemStart)
    }
    else {
      message = message.split(listItemStart).join('\n' + listItemStart)
    }
  }

  return reply(`Last message formatted for ${formatting}:\n\`\`\`${message}\`\`\``,
    args.message)
}