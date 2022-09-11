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
    const result = await pg.db.any(
      'SELECT ${name~} FROM ${db#} WHERE ${userId~} = ${userIdValue}',
      {
        name: SAVED_COMMANDS_COLUMNS.name,
        db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
        userId: SAVED_COMMANDS_COLUMNS.user_id,
        userIdValue: interaction.user.id
      })

    if (!result || !result.length) {
      return await replyOrFollowUp(interaction, commonReplyEmbed.get('Info',
        nws`You didn't save any commands yet. Try saving some with the \`/saveRoll\` command!`))
    }
    let text = ''
    result.forEach(command => {
      text += `\`${command.name}\`\n`
    })
    return await replyOrFollowUp(interaction, commonReplyEmbed.get('Your saved commands:',
      text))
  } catch(error) {
    logger.log(`Failed to get the list of saved commands`, error)
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to list the saved \
      commands. Please contact the author of this bot.`))
  }
}