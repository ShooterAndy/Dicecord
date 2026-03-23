const {
  SAVED_COMMANDS_DB_NAME,
  SAVED_COMMANDS_COLUMNS,
  SAVED_COMMANDS_EXPIRE_AFTER
} = require('../helpers/constants.js')
const pg = require('../helpers/pgHandler')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const errorEmbed = require('../helpers/errorEmbed')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')
const parseSavedCommandScope = require('../helpers/parseSavedCommandScope')

module.exports = async (interaction, args) => {
  const raw = args.name ? args.name.trim().toLowerCase() : null
  if (raw) {
    const { scope, name } = parseSavedCommandScope(raw)
    let result

    const lookupPersonal = async () => pg.db.oneOrNone(
      'SELECT ${name~},${command~},${parameters~} FROM ${db#} ' +
      'WHERE ${userId~}=${userIdValue} AND ${name~}=${nameValue} AND ${guildId~} IS NULL',
      {
        name: SAVED_COMMANDS_COLUMNS.name,
        command: SAVED_COMMANDS_COLUMNS.command,
        parameters: SAVED_COMMANDS_COLUMNS.parameters,
        db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
        userId: SAVED_COMMANDS_COLUMNS.user_id,
        userIdValue: interaction.user.id,
        guildId: SAVED_COMMANDS_COLUMNS.guild_id,
        nameValue: name
      }
    )

    const lookupGuild = async () => {
      if (!interaction.guildId) return null
      return pg.db.oneOrNone(
        'SELECT ${name~},${command~},${parameters~} FROM ${db#} ' +
        'WHERE ${guildId~}=${guildIdValue} AND ${name~}=${nameValue}',
        {
          name: SAVED_COMMANDS_COLUMNS.name,
          command: SAVED_COMMANDS_COLUMNS.command,
          parameters: SAVED_COMMANDS_COLUMNS.parameters,
          db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
          guildId: SAVED_COMMANDS_COLUMNS.guild_id,
          guildIdValue: interaction.guildId,
          nameValue: name
        }
      )
    }

    let isGuild = false
    try {
      if (scope === 'personal') {
        result = await lookupPersonal()
      } else if (scope === 'guild') {
        result = await lookupGuild()
        isGuild = true
      } else {
        // No scope prefix (manual input) — try personal first, then guild
        result = await lookupPersonal()
        if (!result) {
          result = await lookupGuild()
          if (result) isGuild = true
        }
      }
    } catch (error) {
      logger.error(`Failed to get saved command for execution of "${name}"`, error)
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to load the command. \
        Please contact the author of this bot.`))
    }
    if (!result) {
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`You don't seem to have a \
        saved command by the name of \`${name}\`. Perhaps it expired after \
        ${SAVED_COMMANDS_EXPIRE_AFTER} of not being used? You can also try listing all your \
        saved commands via the \`/listSaved\` command to see whether it's still there.`))
    }

    try {
      if (isGuild) {
        await pg.db.none(
          'UPDATE ${db#} SET ${timestamp~} = NOW() ' +
          'WHERE ${guildId~} = ${guildIdValue} AND ${name~} = ${nameValue}',
          {
            db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
            timestamp: SAVED_COMMANDS_COLUMNS.timestamp,
            guildId: SAVED_COMMANDS_COLUMNS.guild_id,
            guildIdValue: interaction.guildId,
            name: SAVED_COMMANDS_COLUMNS.name,
            nameValue: name
          }
        )
      } else {
        await pg.db.none(
          'UPDATE ${db#} SET ${timestamp~} = NOW() ' +
          'WHERE ${userId~} = ${userIdValue} AND ${name~} = ${nameValue} AND ${guildId~} IS NULL',
          {
            db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
            timestamp: SAVED_COMMANDS_COLUMNS.timestamp,
            userId: SAVED_COMMANDS_COLUMNS.user_id,
            userIdValue: interaction.user.id,
            guildId: SAVED_COMMANDS_COLUMNS.guild_id,
            name: SAVED_COMMANDS_COLUMNS.name,
            nameValue: name
          }
        )
      }
    } catch (error) {
      logger.error(`Failed to update timestamp for executing "${name}" saved command`, error)
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to update the command. \
        Please contact the author of this bot.`))
    }

    if (!result.command) {
      logger.error(`No command name in a saved command "${name}"`)
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to process the command. \
        Please contact the author of this bot.`))
    }
    let commandName = result.command.toLowerCase() // Just in case (pun not intended)
    let commandHandler
    try {
      commandHandler = require(`../commandHandlers/${commandName}.js`)
    } catch (error) {
      logger.error(`Failed to get the "${commandName}" commandHandler for execution of "${name}"`,
        error)
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to process the command. \
        Please contact the author of this bot.`))
    }

    if (!commandHandler) {
      logger.error(`Failed to get a "${result.command}" handler for "${name}" saved command`)
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to load the command. \
        Please contact the author of this bot.`))
    }

    const options = {}
    if (result.parameters) {
      const parameters = JSON.parse(result.parameters)
      parameters.forEach(parameter => {
        const camelCasedName = parameter.name.replace(/_([a-z])/g, g => g[1].toUpperCase());
        options[camelCasedName] = parameter.value
      })
    }

    return await commandHandler(interaction, options)

  } else {
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`You have to enter the name of the \
      command you want to load and examine.\nIf you do not remember the name, you can use the \
      \`/listSaved\` command to get the list of all your saved commands.`))
  }
}