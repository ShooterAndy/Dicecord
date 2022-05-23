const pg = require('../helpers/pgHandler')
const {
  DECKS_DB_NAME,
  DECKS_COLUMNS,
  ERROR_PREFIX,
  DECKS_EXPIRE_AFTER,
  COMMENT_SEPARATOR,
  DISCORD_CODE_REGEX
} = require('../helpers/constants')
const replyOrSend = require('../helpers/replyOrSend')
const send = require('../helpers/send')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')

module.exports = async (args) => {
  const numberOfCardsToDraw = args.commandText.trim().split(' ')[0]
  let comment = args.commandText.trim().slice(numberOfCardsToDraw.length).trim()
  comment = comment.replace(DISCORD_CODE_REGEX, '')
  if (comment.startsWith(COMMENT_SEPARATOR)) {
    comment = comment.slice(COMMENT_SEPARATOR.length).trim()
  }
  const verb = args.verb || 'draw'
  const isPrivate = args.isPrivate || false
  await processDrawCommand(args.message, numberOfCardsToDraw, comment, verb, isPrivate, args.prefix)
}

const processDrawCommand = async (message, numberOfCardsToDraw, comment, verb, isPrivate, prefix) =>
{
  let text = '';
  const pastVerb = verb === 'deal' ? 'dealt' : 'drew'
  if (numberOfCardsToDraw === '') {
    numberOfCardsToDraw = 1
  }
  numberOfCardsToDraw = parseInt(numberOfCardsToDraw)
  if (isNaN(numberOfCardsToDraw) || numberOfCardsToDraw < 1) {
    numberOfCardsToDraw = 1
  }

  try {
    const result = await pg.db.oneOrNone(
      'SELECT ${deck~} FROM ${db#} WHERE ${channelId~} = ${channelIdValue}',
      {
        deck: DECKS_COLUMNS.deck,
        db: pg.addPrefix(DECKS_DB_NAME),
        channelId: DECKS_COLUMNS.channel_id,
        channelIdValue: message.channel.id
      })

    if (!result || !result[DECKS_COLUMNS.deck]) {
      return replyOrSend(nws`${ERROR_PREFIX}Couldn't find a deck for this channel. Please \
        \`${prefix}shuffle\` one first. If there was a deck, perhaps it expired and was \
        automatically removed after ${DECKS_EXPIRE_AFTER} of not being drawn from?`, message)
    }
    let deck = []
    try {
      deck = JSON.parse(result[DECKS_COLUMNS.deck]);
    } catch (error) {
      logger.error(nws`Failed to parse the deck for channel "${message.channel.id}"`, error)
      return replyOrSend(nws`${ERROR_PREFIX}Failed to process the deck. Please contact the bot author`,
        message)
    }

    if (deck.length < numberOfCardsToDraw) {
      return replyOrSend(nws`${ERROR_PREFIX}Not enough cards left in the deck (requested \
        ${numberOfCardsToDraw}, but only ${deck.length} cards left). Please reshuffle (by using \
        \`${prefix}shuffle\`) or ${verb} fewer cards.`, message)
    }

    let drawnCards = deck.slice(0, numberOfCardsToDraw)
    deck = deck.slice(numberOfCardsToDraw)
    let cardOrCards = 'cards'
    if (numberOfCardsToDraw === 1) {
      cardOrCards = 'card'
    }
    text = 'You ' + pastVerb + ' ' + numberOfCardsToDraw + ' ' + cardOrCards +
      ' from the deck (' + deck.length + ' left)'
    if (!isPrivate) {
      text += `: \n`
      if (comment) {
        text += `\`${comment}:\` `
      }
      text += drawnCards.join(', ') + '.'
    } else {
      if (comment) {
        text += ` with this comment:\n\`${comment}\``
      } else {
        text += '.'
      }
      text += `\nThe results were sent to your DMs.`
    }

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
      if (isPrivate) {
        try {
          const commentary = comment ? `\`${comment}:\`\n` : `Your ${cardOrCards}:\n`
          const privateText = `${commentary}${drawnCards.join(', ')}`
          if (message.author.dmChannel) {
            await message.author.dmChannel.send(privateText)
          } else {
            const dmChannel = await message.author.createDM()
            if (!dmChannel) {
              throw `Failed to create a new DM channel`
            }
            await message.author.dmChannel.send(privateText)
          }
        } catch (error) {
          logger.error(nws`Failed to send a DM to "${message.author.id}"`, error)
          return replyOrSend(`${ERROR_PREFIX}Failed to send you a DM.`, message)
        }
      }
      return replyOrSend(text, message)
    } catch (error) {
      logger.error(nws`Failed to update the deck for channel "${message.channel.id}"`, error)
      return replyOrSend(`${ERROR_PREFIX}Failed to save the deck.`, message)
    }
  } catch(error) {
    logger.error(`Failed to get the deck for channel "${message.channel.id}"`, error)
  }
}
