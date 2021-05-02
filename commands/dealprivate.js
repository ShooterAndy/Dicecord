const _ = require('underscore')
const { MessageMentions } = require('discord.js')
const pg = require('../helpers/pgHandler')
const {
  DECKS_DB_NAME,
  DECKS_COLUMNS,
  ERROR_PREFIX,
  DECKS_EXPIRE_AFTER,
  MAX_DEAL_TARGETS
} = require('../helpers/constants')
const reply = require('../helpers/reply')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')


module.exports = async (args) => {
  try {
    const numberOfCardsToDraw = getNumberOfCardsToDraw(args.commandText, args.message, args.prefix)
    const mentionsList = getMentionsList(args.message, args.prefix)
    const deckFromDb = await getDeckFromDb(args.message)
    const deck = processDeck(deckFromDb, args.message, args.prefix)
    let comment = args.commandText.trim().slice(numberOfCardsToDraw.toString().length).trim()
    comment = getComment(comment)
    const text = await processDealCommand(args.message, deck, mentionsList, numberOfCardsToDraw,
      comment, args.prefix)
    return reply(text, args.message)
  }
  catch (error) {
    return reply(error, args.message)
  }
}

const getNumberOfCardsToDraw = (commandText, message, prefix) => {
  let numberOfCardsToDraw = commandText.trim().split(' ')[0]
  if (commandText === '') {
    throw nws`Please specify a valid number of cards to deal, for example: \`${prefix}dealPrivate \
    3 @user1, @user2 comment\``
  }
  numberOfCardsToDraw = parseInt(numberOfCardsToDraw)
  if (isNaN(numberOfCardsToDraw) || numberOfCardsToDraw < 1) {
    throw nws`${numberOfCardsToDraw} is not a valid number of cards to deal. Please \
    deal at least one card, for example: \`${prefix}dealPrivate 3 @user1, @user2 comment\``
  }
  return numberOfCardsToDraw
}

const getMentionsList = (message, prefix) => {
  const mentionsList = message.mentions.users.array()
  if (!mentionsList || !mentionsList.length) {
    throw nws`Please mention at least one user (who has access to this channel) whom you want to \
      deal the cards to, for example: \`${prefix}dealPrivate 3 @user1, @user2 comment\``
  }

  if (mentionsList.length > MAX_DEAL_TARGETS) {
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

const processDealCommand = async (message, deck, mentionsList, numberOfCardsToDraw, comment,
                                  prefix) =>
{
  let text = '';

  const totalNumberOfCardsToDraw = mentionsList.length * numberOfCardsToDraw

  if (deck.length < totalNumberOfCardsToDraw) {
    throw nws`${ERROR_PREFIX}Not enough cards left in the deck (requested \
    ${totalNumberOfCardsToDraw}, but only ${deck.length} cards left). Please reshuffle (by using \
    \`${prefix}shuffle\`) or deal fewer cards.`
  } else {
    for (const mention of mentionsList) {
      let drawnCards = deck.slice(0, numberOfCardsToDraw)
      deck = deck.slice(numberOfCardsToDraw)
      try {
        let cardOrCards = 'cards'
        if (numberOfCardsToDraw === 1) {
          cardOrCards = 'card'
        }
        const commentary =
          comment ? `\`${comment}:\`\n` : `You have been dealt these ${cardOrCards}:\n`
        const privateText = `${commentary}${drawnCards.join(', ')}`
        await mention.send(privateText, {split: true})
      } catch (error) {
        logger.error(nws`Failed to send a DM to "${mention.id}"`, error)
        throw`${ERROR_PREFIX}Failed to send a DM to ${mention.tag}.`
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
