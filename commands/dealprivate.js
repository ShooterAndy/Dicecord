const { MessageMentions } = require('discord.js')
const pg = require('../helpers/pgHandler')
const {
  DECKS_DB_NAME,
  DECKS_COLUMNS,
  ERROR_PREFIX,
  DECKS_EXPIRE_AFTER,
  MAX_DEAL_TARGETS,
  COMMENT_SEPARATOR,
  DISCORD_CODE_REGEX
} = require('../helpers/constants')
const replyOrSend = require('../helpers/replyOrSend')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const sendDM = require('../helpers/sendDM')

module.exports = async (args) => {
  try {
    let numberOfCardsToDraw = getNumberOfCardsToDraw(args.commandText, args.message, args.prefix)
    const mentionsList = getMentionsList(args.message, args.prefix)
    const deckFromDb = await getDeckFromDb(args.message)
    const deck = processDeck(deckFromDb, args.message, args.prefix)
    let comment = args.commandText.trim()
    if (numberOfCardsToDraw !== -1) {
      comment = comment.slice(numberOfCardsToDraw.toString().length).trim()
    } else {
      numberOfCardsToDraw = 1
    }
    comment = getComment(comment)
    const text = await processDealCommand(args.message, deck, mentionsList, numberOfCardsToDraw,
      comment, args.prefix)
    if (text) {
      return await replyOrSend(text, args.message)
    }
    return null
  }
  catch (error) {
    if (typeof error === 'string') {
      return await replyOrSend(error, args.message)
    } else {
      logger.error('Error in dealPrivate', error)
      return await replyOrSend(`${ERROR_PREFIX}Failed to deal. Please contact the author.`)
    }
  }
}

const getNumberOfCardsToDraw = (commandText) => {
  let numberOfCardsToDraw = commandText.trim().split(' ')[0]
  if (commandText === '') {
    return -1
  }
  numberOfCardsToDraw = parseInt(numberOfCardsToDraw)
  if (isNaN(numberOfCardsToDraw) || numberOfCardsToDraw < 1) {
    return -1
  }
  return numberOfCardsToDraw
}

const getMentionsList = (message, prefix) => {
  const mentionsList = message.mentions.users
  if (!mentionsList || !mentionsList.size) {
    throw nws`Please mention at least one user (who has access to this channel) whom you want to \
      deal the cards to, for example: \`${prefix}dealPrivate 3 @user1, @user2 comment\``
  }

  if (mentionsList.size > MAX_DEAL_TARGETS) {
    throw nws`You've mentioned ${mentionsList.length} users, but, to prevent mass spam, the \
      maximum allowed number of users you can deal cards to at once is ${MAX_DEAL_TARGETS}.`
  }

  return mentionsList
}

const removeLeadingCommas = (text) => {
  text = text.trim()
  if (text && text.length && text.startsWith(',')) {
    text = text.slice(1)
    return removeLeadingCommas(text)
  } else {
    return text
  }
}

const getComment = (commandText) => {
  if (!commandText || !commandText.length) {
    return ''
  }
  let comment = commandText.replace(MessageMentions.USERS_PATTERN, '').trim()
  if (comment) {
    comment = removeLeadingCommas(comment)
    comment = comment.replace(DISCORD_CODE_REGEX, '')
    if (comment.startsWith(COMMENT_SEPARATOR)) {
      comment = comment.slice(COMMENT_SEPARATOR.length).trim()
    }
  }
  return comment || ''
}

const getDeckFromDb = async (message) => {
  try {
    return pg.db.oneOrNone(
      'SELECT ${deck~} FROM ${db#} WHERE ${channelId~} = ${channelIdValue}',
      {
        deck: DECKS_COLUMNS.deck,
        db: pg.addPrefix(DECKS_DB_NAME),
        channelId: DECKS_COLUMNS.channel_id,
        channelIdValue: message.channel.id
      })
  } catch(error) {
    throw `Failed to get the deck for channel "${message.channel.id}"`
  }
}

const processDeck = (deckFromDb, message, prefix) => {
  if (!deckFromDb || !deckFromDb[DECKS_COLUMNS.deck]) {
    throw nws`${ERROR_PREFIX}Couldn't find a deck for this channel. Please \
          \`${prefix}shuffle\` one first. If there was a deck, perhaps it expired and was \
          automatically removed after ${DECKS_EXPIRE_AFTER} of not being drawn from?`
  }
  try {
    return JSON.parse(deckFromDb[DECKS_COLUMNS.deck]);
  } catch (error) {
    logger.error(nws`Failed to parse the deck for channel "${message.channel.id}"`, error)
    throw nws`${ERROR_PREFIX}Failed to process the deck. Please contact the bot author`
  }
}

const processDealCommand = async (message, deck, mentionsList, numberOfCardsToDraw, comment, prefix) => {
  let text = '';

  const totalNumberOfCardsToDraw = mentionsList.size * numberOfCardsToDraw

  if (deck.length < totalNumberOfCardsToDraw) {
    throw nws`${ERROR_PREFIX}Not enough cards left in the deck (requested \
    ${totalNumberOfCardsToDraw}, but only ${deck.length} cards left). Please reshuffle (by using \
    \`${prefix}shuffle\`) or deal fewer cards.`
  } else {
    let authorName
    if (message.member) {
      authorName = message.member.displayName
    } else {
      authorName = message.author.username
    }
    const mentionsArray = []
    mentionsList.forEach(mention => {
      mentionsArray.push(mention)
    })

    for (const mention of mentionsArray) {
      let drawnCards = deck.slice(0, numberOfCardsToDraw)
      deck = deck.slice(numberOfCardsToDraw)
      let cardOrCards = 'these cards'
      if (numberOfCardsToDraw === 1) {
        cardOrCards = 'this card'
      }
      const commentary =
        comment ? `${authorName} → \`${comment}:\`\n` :
          `You have been dealt ${cardOrCards} by ${authorName}:\n`
      const privateText = `${commentary}${drawnCards.join(', ')}`
      if (!await sendDM(privateText, mention)) {
        try {
          await replyOrSend(`${ERROR_PREFIX}Failed to send a DM to user ${mention.username}.`, message)
          return null
        } catch (error) {
          logger.error(nws`Failed to inform a user about failing to send a DM to them in dealPrivate`, error)
          return null
        }
      }
    }

    let cardOrCards = 'cards'
    if (totalNumberOfCardsToDraw === 1) {
      cardOrCards = 'card'
    }
    text = 'You dealt ' + totalNumberOfCardsToDraw + ' ' + cardOrCards +
      ' from the deck (' + deck.length + ' left)'
    if (comment) {
      text += ` with this comment:\n\`${comment}\``
    } else {
      text += '.'
    }
    let userOrUsers = 'users'
    if (mentionsList.length === 1) {
      userOrUsers = 'user'
    }
    text += `\nThe results were sent to the DMs of the mentioned ${userOrUsers}.`

    try {
      await pg.db.none(
        'UPDATE ${db#} SET ${deck~} = ${deckValue}, ${timestamp~} = NOW() ' +
        'WHERE ${channelId~}=${channelIdValue}',
        {
          db: pg.addPrefix(DECKS_DB_NAME),
          deck: DECKS_COLUMNS.deck,
          deckValue: JSON.stringify(deck),
          channelId: DECKS_COLUMNS.channel_id,
          channelIdValue: message.channel.id,
          timestamp: DECKS_COLUMNS.timestamp
        }
      )
      return text
    } catch (error) {
      logger.error(nws`Failed to update the deck for channel "${message.channel.id}"`, error)
      throw`${ERROR_PREFIX}Failed to save the deck. Please contact the bot author.`
    }
  }
}
