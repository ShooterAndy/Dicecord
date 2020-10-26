const {
  SAVED_ROLL_COMMANDS_DB_NAME,
  SAVED_ROLL_COMMANDS_COLUMNS,
  ERROR_PREFIX
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const reply = require('../helpers/reply')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')

module.exports = async (args) => {
  const commandText = args.commandText.trim()
  if (commandText) {
    const indexOfFirstSpace = commandText.indexOf(' ')
    if (indexOfFirstSpace !== -1) {
      const name = commandText.slice(0, indexOfFirstSpace).trim().toLowerCase()
      const command = commandText.slice(indexOfFirstSpace).trim()
      try {
        // todo: change to user_id, add max amount
        await pg.upsertWithoutId(
          SAVED_ROLL_COMMANDS_DB_NAME,
          [SAVED_ROLL_COMMANDS_COLUMNS.channel_id, SAVED_ROLL_COMMANDS_COLUMNS.name],
          [
            SAVED_ROLL_COMMANDS_COLUMNS.channel_id,
            SAVED_ROLL_COMMANDS_COLUMNS.name,
            SAVED_ROLL_COMMANDS_COLUMNS.command
          ], [
            args.message.channel.id,
            name,
            command
          ], SAVED_ROLL_COMMANDS_COLUMNS.timestamp)
        return reply(nws`Your command \`${name}\` was saved successfully! You can roll it like \
          this:\n\`${args.prefix}rollSaved ${name}\``, args.message)
      } catch (error) {
        logger.error(`Failed to save a roll command`, error)
        return reply(nws`${ERROR_PREFIX}Failed to save the command. Please contact the bot author.`,
          args.message)
      }
    } else {
      return reply(nws`${ERROR_PREFIX}You have to enter the command you want to have saved after \
        the name, for example:\n\`${args.prefix}${args.commandName} ${commandText} 2d10+6\``,
        args.message)
    }
  } else {
    return reply(nws`${ERROR_PREFIX}You have to enter the name you want to use followed by the \
      command you want to have saved, for example:\n\`${args.prefix}${args.commandName} some-name \
      2d10+6\``, args.message)
  }
}