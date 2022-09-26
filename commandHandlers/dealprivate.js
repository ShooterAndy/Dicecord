const pg = require('../helpers/pgHandler')
const {
  DECKS_DB_NAME,
  DECKS_COLUMNS,
  DECKS_EXPIRE_AFTER,
  MAX_DEAL_TARGETS,
  DISCORD_CODE_REGEX
} = require('../helpers/constants')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const sendDM = require('../helpers/sendDM')
const errorEmbed = require('../helpers/errorEmbed')
const saveableReplyEmbed = require('../helpers/saveableReplyEmbed')
const genericCommandSaver = require('../helpers/genericCommandSaver')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')

module.exports = async (interaction, args) => {
  try {
    let { numberOfCardsToDraw, comment, usersList } = args
    const mentionsList = await getMentionsList(interaction, usersList)
    const deckFromDb = await getDeckFromDb(interaction)
    const deck = processDeck(deckFromDb, interaction)
    numberOfCardsToDraw = numberOfCardsToDraw || 1
    comment = comment ? comment.replace(DISCORD_CODE_REGEX, '').trim() : null
    if (numberOfCardsToDraw < 1) {
      return await replyOrFollowUp(interaction, errorEmbed.get(`Can't deal less than one card.`))
    }
    const text = await processDealCommand(interaction, deck, mentionsList, numberOfCardsToDraw,
      comment)
    if (text) {
      const reply = saveableReplyEmbed.get('Deal results:', text)
      reply.fetchReply = true

      const r = await replyOrFollowUp(interaction, reply)
      if (!r) return null

      await genericCommandSaver.launch(interaction, r)
    }
    return null
  }
  catch (error) {
    if (typeof error === 'string') {
      return await replyOrFollowUp(interaction, errorEmbed.get(error))
    } else {
      logger.error('Error in dealPrivate', error)
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to deal. Please contact \
        the author of this bot.`))
    }
  }
}

const getMentionsList = async (interaction, usersList) => {
  const userIds = usersList.match(/<@!(\d+)>/g)
  let mentionsList = []
  if (userIds && userIds.length) {
    for (let userId of userIds) {
      userId = userId.replace('<@!', '').replace('>', '')
      let user
      try {
        user = await interaction.guild.members.fetch(userId)
        if (user) {
          mentionsList.push(user)
        } else {
          logger.error(`User "${userId}" not found in getMentionsList`)
        }
      } catch (e) {
        logger.error(`Failed to resolve a mention of a user "${userId}" in getMentionsList`)
      }
    }
  }
  if (!mentionsList || !mentionsList.length) {
    throw nws`No functional user-mentions found in your request.`
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

const getDeckFromDb = async (interaction) => {
  try {
    return pg.db.oneOrNone(
      'SELECT ${deck~} FROM ${db#} WHERE ${channelId~} = ${channelIdValue}',
      {
        deck: DECKS_COLUMNS.deck,
        db: pg.addPrefix(DECKS_DB_NAME),
        channelId: DECKS_COLUMNS.channel_id,
        channelIdValue: interaction.channelId
      })
  } catch(error) {
    throw `Failed to get the deck for channel "${interaction.channelId}"`
  }
}

const processDeck = (deckFromDb, interaction) => {
  if (!deckFromDb || !deckFromDb[DECKS_COLUMNS.deck]) {
   throw nws`Couldn't find a deck for this channel. Please \`/shuffle\` one first. If there was a \
    deck, perhaps it expired and was automatically removed after ${DECKS_EXPIRE_AFTER} of not \
    being drawn from?`
  }
  try {
    return JSON.parse(deckFromDb[DECKS_COLUMNS.deck]);
  } catch (error) {
    logger.error(nws`Failed to parse the deck for channel "${interaction.channelId}"`, error)
    throw nws`Failed to process the deck. Please contact the author of this bot.`
  }
}

const processDealCommand = async (interaction, deck, mentionsList, numberOfCardsToDraw, comment) => {
  let text = '';

  const totalNumberOfCardsToDraw = mentionsList.length * numberOfCardsToDraw

  if (deck.length < totalNumberOfCardsToDraw) {
    throw nws`Not enough cards left in the deck (requested ${totalNumberOfCardsToDraw}, but only \
      ${deck.length} cards left). Please reshuffle (by using \`/shuffle\`) or deal fewer cards.`
  } else {
    let authorName
    if (interaction.member) {
      authorName = interaction.member.displayName
    } else {
      authorName = interaction.user.username
    }

    for (const mention of mentionsList) {
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
          await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to send a DM to user \
            ${mention.username}.`))
          return null
        } catch (error) {
          logger.error(nws`Failed to inform a user about failing to send a DM to them in \
            dealPrivate`, error)
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
          channelIdValue: interaction.channelId,
          timestamp: DECKS_COLUMNS.timestamp
        }
      )
      return text
    } catch (error) {
      logger.error(nws`Failed to update the deck for channel "${interaction.channelId}"`, error)
      throw`Failed to save the deck. Please contact the author of this bot.`
    }
  }
}
