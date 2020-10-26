const {
  UPSERT_SAVED_ROLL_COMMAND_RESULTS,
  MAX_SAVED_ROLL_COMMANDS_PER_USER,
  SAVED_ROLL_COMMANDS_EXPIRE_AFTER,
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
        const result = await pg.upsertSavedRollCommand(
          [args.message.author.id, name, command]
        )
        switch (result) {
          case UPSERT_SAVED_ROLL_COMMAND_RESULTS.inserted: {
            return reply(nws`Your command \`${name}\` was saved successfully! You can roll it like \
              this:\n\`${args.prefix}rollSaved ${name}\`\nor examine it like \
              this:\n\`${args.prefix}getSaved ${name}\`\nBe aware that your saved commands will \
              expire and be automatically **deleted** after ${SAVED_ROLL_COMMANDS_EXPIRE_AFTER} of \
              being rolled or examined last.`, args.message)
          }
          case UPSERT_SAVED_ROLL_COMMAND_RESULTS.updated: {
            return reply(nws`Your command \`${name}\` was successfully updated! You can roll it \
              like this:\n\`${args.prefix}rollSaved ${name}\`\nor examine it like \
              this:\n\`${args.prefix}getSaved ${name}\`\nBe aware that your saved commands will \
              expire and be automatically **deleted** after ${SAVED_ROLL_COMMANDS_EXPIRE_AFTER} of \
              being rolled or examined last.`, args.message)
          }
          case UPSERT_SAVED_ROLL_COMMAND_RESULTS.limit: {
            return reply(nws`Unfortunately, you already have ${MAX_SAVED_ROLL_COMMANDS_PER_USER} \
              saved roll commands. You can delete one like this: \
              \n\`${args.prefix}deleteSaved some-name\``, args.message)
          }
          default: {
            logger.error(`Unknown upsert_saved_roll_command type result`)
            return reply(nws`Something went wrong. Please contact the bot author.`, args.message)
          }
        }

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