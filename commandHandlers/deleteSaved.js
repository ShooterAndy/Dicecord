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

module.exports = async (interaction, args) => {
  let { name } = args
  if (name && name.trim()) {
    name = name.trim()
    try {
      const result = await pg.db.oneOrNone(
        'DELETE FROM ${db#} WHERE ${userId~} = ${userIdValue} AND ${name~} = ${nameValue} ' +
        'RETURNING *', {
          db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
          userId: SAVED_COMMANDS_COLUMNS.user_id,
          userIdValue: interaction.user.id,
          name: SAVED_COMMANDS_COLUMNS.name,
          nameValue: name
        })
      if (!result) {
        return await interaction.reply(errorEmbed.get(nws`You don't seem to have a saved \
          command by the name of \`${name}\`. Perhaps it already expired after \
          ${SAVED_COMMANDS_EXPIRE_AFTER} of not being used? You can also try listing all your \
          saved commands via the \`/listSaved\` command.`))
      }
      return await interaction.reply(commonReplyEmbed.get(`Success`,
        nws`The \`${name}\` saved command has been successfully deleted from the \
        list of your saved commands.`))
    } catch (error) {
      logger.error(`Failed to delete a saved roll command`, error)
      return await interaction.reply(errorEmbed.get(nws`Failed to delete the command. Please \
        contact the author of this bot.`))
    }
  } else {
    return await interaction.reply(errorEmbed.get(nws`You have to enter the name of the command \
      you want to delete.\nIf you do not remember the name, you can use the \`/listSaved\` command \
      to get the list of all your saved commands.`))
  }
}