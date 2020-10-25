const {
  SAVED_ROLL_COMMANDS_DB_NAME,
  SAVED_ROLL_COMMANDS_COLUMNS,
  ERROR_PREFIX
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const reply = require('../helpers/reply')
const nws = require('../helpers/nws')

module.exports = async (args) => {
  const name = args.commandText.trim()
  if (name) {
    try {
      const result = await pg.deleteOneOrNone(SAVED_ROLL_COMMANDS_DB_NAME, nws`WHERE \
        ${SAVED_ROLL_COMMANDS_COLUMNS.channel_id} = '${args.message.channel.id}' AND \
        ${SAVED_ROLL_COMMANDS_COLUMNS.name} = '${name}'`)
      if (!result) {
        return reply(nws`Couldn't find the \`${name}\` command among the ones saved for this \
          Discord channel. Please try listing all saved commands for this Discord channel via the \
          \`${args.prefix}listSaved\` command`, args.message)
      }
      return reply(nws`The \`${name}\` has been successfully deleted from the list of saved \
        commands for this Discord channel.`, args.message)
    } catch (error) {
      console.log(error)
      return reply(nws`${ERROR_PREFIX}Failed to delete the command. Please contact the bot author.`,
        args.message)
    }
  } else {
    return reply(nws`${ERROR_PREFIX}You have to enter the name of the command you want to delete, \
      for example:\n\`${args.prefix}${args.commandName} some-name\`\nIf you do not remember the \
      name, you can use the \`${args.prefix}listSaved\` command to get the list of all saved \
      commands for this Discord channel.`,
      args.message)
  }
}