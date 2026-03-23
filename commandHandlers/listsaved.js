const {
  SAVED_COMMANDS_DB_NAME,
  SAVED_COMMANDS_COLUMNS,
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const errorEmbed = require('../helpers/errorEmbed')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')

module.exports = async (interaction, args) => {
  try {
    // Personal commands
    const personalResult = await pg.db.any(
      'SELECT ${name~} FROM ${db#} WHERE ${userId~} = ${userIdValue} AND ${guildId~} IS NULL',
      {
        name: SAVED_COMMANDS_COLUMNS.name,
        db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
        userId: SAVED_COMMANDS_COLUMNS.user_id,
        userIdValue: interaction.user.id,
        guildId: SAVED_COMMANDS_COLUMNS.guild_id
      })

    // Guild commands
    let guildResult = []
    if (interaction.guildId) {
      guildResult = await pg.db.any(
        'SELECT ${name~} FROM ${db#} WHERE ${guildId~} = ${guildIdValue}',
        {
          name: SAVED_COMMANDS_COLUMNS.name,
          db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
          guildId: SAVED_COMMANDS_COLUMNS.guild_id,
          guildIdValue: interaction.guildId
        })
    }

    const hasPersonal = personalResult && personalResult.length
    const hasGuild = guildResult && guildResult.length

    if (!hasPersonal && !hasGuild) {
      return await replyOrFollowUp(interaction, commonReplyEmbed.get('Info',
        nws`You didn't save any commands yet. Try saving some with the 💾 button after executing \
        a command!`))
    }

    let text = ''
    if (hasPersonal) {
      if (hasGuild || interaction.guildId) {
        text += '**Your personal commands:**\n'
      }
      personalResult.forEach(command => {
        text += `\`${command.name}\`\n`
      })
    }
    if (hasGuild) {
      if (hasPersonal) text += '\n'
      text += '**Server-wide commands:**\n'
      guildResult.forEach(command => {
        text += `\`${command.name}\`\n`
      })
    }

    return await replyOrFollowUp(interaction, commonReplyEmbed.get(
      'Saved commands:', text))
  } catch(error) {
    logger.log(`Failed to get the list of saved commands`, error)
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to list the saved \
      commands. Please contact the author of this bot.`))
  }
}