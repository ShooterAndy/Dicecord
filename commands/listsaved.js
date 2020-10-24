const {
  SAVED_ROLL_COMMANDS_DB_NAME,
  SAVED_ROLL_COMMANDS_COLUMNS,
  ERROR_PREFIX
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const reply = require('../helpers/reply')
const nws = require('../helpers/nws')

module.exports = async (args) => {
  try {
    const result = await pg.any(SAVED_ROLL_COMMANDS_DB_NAME,
      `WHERE ${SAVED_ROLL_COMMANDS_COLUMNS.channel_id} = '${args.message.channel.id}'`,
      [SAVED_ROLL_COMMANDS_COLUMNS.name])
    if (!result || !result.length) {
      reply(nws`There are no roll commands saved for this channel yet. Try saving some with the \
        \`${args.prefix}saveroll NAME COMMAND\` command!`,
        args.message).catch(console.error)
      return
    }
    let text = 'Here\'s the list of all roll commands saved for this channel:\n'
    result.forEach(command => {
      text += `\`${command.name}\`\n`
    })
    reply(text, args.message).catch(console.error)
  } catch(error) {
    console.log(error)
    reply(nws`${ERROR_PREFIX}Failed to list the saved commands. Please contact the bot author.`,
      args.message).catch(console.error)
  }
}