const {
  SAVED_ROLL_COMMANDS_DB_NAME,
  SAVED_ROLL_COMMANDS_COLUMNS,
  ERROR_PREFIX,
  SAVED_ROLL_COMMANDS_EXPIRE_AFTER
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const replyOrSend = require('../helpers/replyOrSend')
const nws = require('../helpers/nws')
const roll = require('./r')
const logger = require('../helpers/logger')

module.exports = async (args) => {
  const name = args.commandText.trim().toLowerCase()
  if (name) {
    try {
      const result = await pg.db.oneOrNone(
        'SELECT ${command~} FROM ${db#} ' +
        'WHERE ${userId~}=${userIdValue} AND ${name~}=${nameValue}',
        {
          command: SAVED_ROLL_COMMANDS_COLUMNS.command,
          db: pg.addPrefix(SAVED_ROLL_COMMANDS_DB_NAME),
          userId: SAVED_ROLL_COMMANDS_COLUMNS.user_id,
          userIdValue: args.message.author.id,
          name: SAVED_ROLL_COMMANDS_COLUMNS.name,
          nameValue: name
        }
      )
      if (!result || !result.command) {
        return replyOrSend(nws`You don't seem to have a saved roll command by the name of \`${name}\`. \
          Perhaps it expired after ${SAVED_ROLL_COMMANDS_EXPIRE_AFTER} of not being used? \
          You can also try listing all your saved roll commands via the \ 
          \`${args.prefix}listSaved\` command`, args.message)
      }
      const argsForRoll = {
        message: args.message,
        commandName: 'roll',
        commandText: result.command,
        client: args.client,
        prefix: args.prefix
      }
      await roll(argsForRoll)

      try {
        await pg.db.none(
          'UPDATE ${db#} SET ${timestamp~} = NOW() ' +
          'WHERE ${userId~} = ${userIdValue} AND ${name~} = ${nameValue}',
          {
            db: pg.addPrefix(SAVED_ROLL_COMMANDS_DB_NAME),
            timestamp: SAVED_ROLL_COMMANDS_COLUMNS.timestamp,
            userId: SAVED_ROLL_COMMANDS_COLUMNS.user_id,
            userIdValue: args.message.author.id,
            name: SAVED_ROLL_COMMANDS_COLUMNS.name,
            nameValue: name
          }
        )
      } catch (error) {
        logger.error(`Failed to update timestamp in ${args.commandName}`, error)
        return replyOrSend(nws`${ERROR_PREFIX}Failed to update the command. Please contact the bot \
          author.`, args.message)
      }
    } catch (error) {
      logger.error(`Failed to load a saved roll command`, error)
      return replyOrSend(nws`${ERROR_PREFIX}Failed to load the command. Please contact the bot author.`,
        args.message)
    }
  } else {
    return replyOrSend(nws`${ERROR_PREFIX}You have to enter the name of the command you want to load and \
      roll, for example:\n\`${args.prefix}${args.commandName} some-name\`\nIf you do not remember \
      the name, you can use the \`${args.prefix}listSaved\` command to get the list of all saved \
      commands for this Discord channel.`,
      args.message)
  }
}