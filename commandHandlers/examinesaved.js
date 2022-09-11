const {
  SAVED_COMMANDS_DB_NAME,
  SAVED_COMMANDS_COLUMNS,
  SAVED_COMMANDS_EXPIRE_AFTER
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const errorEmbed = require('../helpers/errorEmbed')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')

module.exports = async (interaction, args) => {
  const name = args.name.trim().toLowerCase()
  if (name) {
    try {
      const result = await pg.db.oneOrNone(
        'SELECT ${name~},${command~},${parameters~} FROM ${db#} ' +
        'WHERE ${userId~}=${userIdValue} AND ${name~}=${nameValue}',
        {
          name: SAVED_COMMANDS_COLUMNS.name,
          command: SAVED_COMMANDS_COLUMNS.command,
          parameters: SAVED_COMMANDS_COLUMNS.parameters,
          db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
          userId: SAVED_COMMANDS_COLUMNS.user_id,
          userIdValue: interaction.user.id,
          nameValue: name
        }
      )
      if (!result) {
        return await replyOrFollowUp(interaction, errorEmbed.get(nws`You don't seem to have a \
          saved command by the name of \`${name}\`. Perhaps it expired after \
          ${SAVED_COMMANDS_EXPIRE_AFTER} of not being used? You can also try listing all your \
          saved commands via the \`/listSaved\` command to see whether it's still there.`))
      }

      try {
        await pg.db.none(
          'UPDATE ${db#} SET ${timestamp~} = NOW() ' +
          'WHERE ${userId~} = ${userIdValue} AND ${name~} = ${nameValue}',
          {
            db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
            timestamp: SAVED_COMMANDS_COLUMNS.timestamp,
            userId: SAVED_COMMANDS_COLUMNS.user_id,
            userIdValue: interaction.user.id,
            name: SAVED_COMMANDS_COLUMNS.name,
            nameValue: name
          }
        )
      } catch (error) {
        logger.error(`Failed to update timestamp for examining "${name}" saved command`, error)
        return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to update the command. \
          Please contact the author of this bot.`))
      }

      let commandText = result.command
      if (result.parameters) {
        const parameters = JSON.parse(result.parameters)
        parameters.forEach(parameter => {
          commandText += ` ${parameter.name}:${parameter.value}`
        })
      }
      return await replyOrFollowUp(interaction, commonReplyEmbed.get(
        `Your "${name}" saved command:`,
        `\`\`\`/${commandText}\`\`\`\nYou can use it via \`/executeSaved name:${name}\``))
    } catch (error) {
      logger.error(`Failed to get saved command for examination`, error)
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to load the command. \
        Please contact the author of this bot.`))
    }
  } else {
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`You have to enter the name of the \
      command you want to load and examine.\nIf you do not remember the name, you can use the \
      \`/listSaved\` command to get the list of all your saved commands.`))
  }
}