const {
  SAVED_ROLL_COMMANDS_DB_NAME,
  SAVED_ROLL_COMMANDS_COLUMNS,
  ERROR_PREFIX,
  SAVED_ROLL_COMMANDS_EXPIRE_AFTER
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const reply = require('../helpers/reply')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')

module.exports = async (args) => {
  const name = args.commandText.trim()
  if (name) {
    try {
      const result = await pg.deleteOneOrNone(SAVED_ROLL_COMMANDS_DB_NAME, nws`WHERE \
        ${SAVED_ROLL_COMMANDS_COLUMNS.user_id} = '${args.message.author.id}' AND \
        ${SAVED_ROLL_COMMANDS_COLUMNS.name} = '${name}'`)
      if (!result) {
        return reply(nws`You don't seem to have a saved roll command by the name of \`${name}\`. \
          Perhaps it already expired after ${SAVED_ROLL_COMMANDS_EXPIRE_AFTER} of not being used? \
          You can also try listing all your saved roll commands via the \ 
          \`${args.prefix}listSaved\` command`, args.message)
      }
      return reply(nws`The \`${name}\` has been successfully deleted from the list of your saved \
        commands.`, args.message)
    } catch (error) {
      logger.error(`Failed to delete a saved roll command`, error)
      return reply(nws`${ERROR_PREFIX}Failed to delete the command. Please contact the bot author.`,
        args.message)
    }
  } else {
    return reply(nws`${ERROR_PREFIX}You have to enter the name of the command you want to delete, \
      for example:\n\`${args.prefix}${args.commandName} some-name\`\nIf you do not remember the \
      name, you can use the \`${args.prefix}listSaved\` command to get the list of all your saved \
      commands.`, args.message)
  }
}