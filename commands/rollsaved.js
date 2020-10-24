const {
  SAVED_ROLL_COMMANDS_DB_NAME,
  SAVED_ROLL_COMMANDS_COLUMNS,
  ERROR_PREFIX
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const reply = require('../helpers/reply')
const nws = require('../helpers/nws')
const roll = require('./r')

module.exports = async (args) => {
  const name = args.commandText.trim()
  if (name) {
    try {
      const result = await pg.oneOrNone(SAVED_ROLL_COMMANDS_DB_NAME, nws`WHERE \
        ${SAVED_ROLL_COMMANDS_COLUMNS.channel_id} = '${args.message.channel.id}' AND \
        ${SAVED_ROLL_COMMANDS_COLUMNS.name} = '${name}'`)
      if (!result) {
        reply(nws`Couldn't find the \`${name}\` command among the ones saved for this Discord \
          channel. Please try listing all saved commands for this Discord channel via the \
          \`${args.prefix}listsaved\` command`, args.message).catch(console.error)
        return
      }
      const argsForRoll = {
        message: args.message,
        commandName: 'roll',
        commandText: result.command,
        client: args.client,
        prefix: args.prefix
      }
      roll(argsForRoll)

      // TODO: update last used timestamp!
      try {
        await pg.upsertWithoutId(
          SAVED_ROLL_COMMANDS_DB_NAME,
          [SAVED_ROLL_COMMANDS_COLUMNS.channel_id, SAVED_ROLL_COMMANDS_COLUMNS.name],
          [], [], SAVED_ROLL_COMMANDS_COLUMNS.timestamp)
      } catch (error) {
        console.log(error)
        reply(nws`${ERROR_PREFIX}Failed to update the command. Please contact the bot author.`,
          args.message).catch(console.error)
      }
    } catch (error) {
      console.log(error)
      reply(nws`${ERROR_PREFIX}Failed to load the command. Please contact the bot author.`,
        args.message).catch(console.error)
    }
  } else {
    reply(nws`${ERROR_PREFIX}You have to enter the name of the command you want to load and roll, \
      for example:\n\`${args.prefix}${args.commandName} some-name\`\nIf you do not remember the \
      name, you can use the \`${args.prefix}listsaved\` command to get the list of all saved \
      commands for this Discord channel.`,
      args.message).catch(console.error)
  }
}