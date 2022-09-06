const pg = require('../helpers/pgHandler')
const {
  DECKS_DB_NAME,
  DECKS_COLUMNS,
  DECKS_EXPIRE_AFTER,
  DISCORD_CODE_REGEX
} = require('../helpers/constants')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const sendDM = require('../helpers/sendDM')
const errorEmbed = require('../helpers/errorEmbed')
const saveableReplyEmbed = require('../helpers/saveableReplyEmbed')
const genericCommandSaver = require('../helpers/genericCommandSaver')

module.exports = async (interaction, args) => {
  let { numberOfCardsToDraw, comment, isPrivate } = args
  if (comment) comment = comment.replace(DISCORD_CODE_REGEX, '').trim()
  const verb = (interaction.commandName || 'draw').toLowerCase()
  isPrivate = isPrivate || false
  await processDrawCommand(interaction, numberOfCardsToDraw, comment, verb, isPrivate)
}

const processDrawCommand = async (interaction, numberOfCardsToDraw, comment, verb, isPrivate) =>
{
  let text = '';
  const pastVerb = (verb === 'deal' || verb === 'dealprivate') ? 'dealt' : 'drew'
  if (!numberOfCardsToDraw) {
    numberOfCardsToDraw = 1
  }
  if (numberOfCardsToDraw < 1) {
    return await interaction.reply(errorEmbed.get(`Can't ${verb} less than one card.`))
  }

  try {
    const result = await pg.db.oneOrNone(
      'SELECT ${deck~} FROM ${db#} WHERE ${channelId~} = ${channelIdValue}',
      {
        deck: DECKS_COLUMNS.deck,
        db: pg.addPrefix(DECKS_DB_NAME),
        channelId: DECKS_COLUMNS.channel_id,
        channelIdValue: interaction.channel.id
      })

    if (!result || !result[DECKS_COLUMNS.deck]) {
      return await interaction.reply(errorEmbed.get(nws`Couldn't find a deck for this channel. \
        Please \`/shuffle\` one first. If there was a deck, perhaps it expired and was \
        automatically removed after ${DECKS_EXPIRE_AFTER} of not being drawn from?`))
    }
    let deck = []
    try {
      deck = JSON.parse(result[DECKS_COLUMNS.deck]);
    } catch (error) {
      logger.error(nws`Failed to parse the deck for channel "${interaction.channel.id}"`, error)
      return await interaction.reply(errorEmbed.get(nws`Failed to process the deck. Please contact \
        the author of this bot.`))
    }

    if (deck.length < numberOfCardsToDraw) {
      return await interaction.reply(errorEmbed.get(nws`Not enough cards left in the deck \
        (requested ${numberOfCardsToDraw}, but only ${deck.length} cards left). Please reshuffle \
        the deck (by using the \`/shuffle\` command), or ${verb} fewer cards.`))
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
          channelIdValue: interaction.channel.id,
          timestamp: DECKS_COLUMNS.timestamp
        }
      )
      if (isPrivate) {
        const commentary = comment ? `\`${comment}:\`\n` : `Your ${cardOrCards}:\n`
        const privateText = `${commentary}${drawnCards.join(', ')}`
        if (!await sendDM(privateText, interaction)) {
          try {
            return await interaction.reply(errorEmbed.get(`Failed to send you a DM.`))
          } catch (error) {
            logger.error(nws`Failed to inform a user about failing send a DM to them in \
              drawPrivate`, error)
          }
        }
      }
      const reply = saveableReplyEmbed.get('Your cards:', text)
      reply.fetchReply = true

      const r = await interaction.reply(reply)
      genericCommandSaver.launch(interaction, r)
    } catch (error) {
      logger.error(nws`Failed to update the deck for channel "${interaction.channel.id}"`, error)
      return await interaction.reply(errorEmbed.get(nws`Failed to save the deck.`))
    }
  } catch(error) {
    logger.error(`Failed to get the deck for channel "${interaction.channel.id}"`, error)
  }
}
