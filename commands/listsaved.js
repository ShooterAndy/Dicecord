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
  try {
    const result = await pg.db.any(
      'SELECT ${name~} FROM ${db#} WHERE ${userId~} = ${userIdValue}',
      {
        name: SAVED_ROLL_COMMANDS_COLUMNS.name,
        db: pg.addPrefix(SAVED_ROLL_COMMANDS_DB_NAME),
        userId: SAVED_ROLL_COMMANDS_COLUMNS.user_id,
        userIdValue: args.message.author.id
      })

    if (!result || !result.length) {
      return reply(nws`You don't have any roll commands saved yet. Try saving some with \
        the \`${args.prefix}saveRoll some-name your roll command\` command!`,
        args.message)
    }
    let text = 'Here\'s the list of all your saved roll commands:\n'
    result.forEach(command => {
      text += `\`${command.name}\`\n`
    })
    return reply(text, args.message)
  } catch(error) {
    logger.log(`Failed to get the list of saved roll commands`, error)
    return reply(nws`${ERROR_PREFIX}Failed to list the saved commands. Please contact the bot \
      author.`, args.message)
  }
}