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
const replyOrFollowUp = require('../helpers/replyOrFollowUp')
const Client = require('../helpers/client')
const parseSavedCommandScope = require('../helpers/parseSavedCommandScope')
const { PermissionFlagsBits } = require('discord.js')

module.exports = async (interaction, args) => {
  const raw = args.name ? args.name.trim() : null
  if (raw) {
    const { scope, name } = parseSavedCommandScope(raw.toLowerCase())
    const isGuild = scope === 'guild'

    try {
      if (isGuild) {
        if (!interaction.guildId) {
          return await replyOrFollowUp(interaction,
            errorEmbed.get('Server commands cannot be deleted from DMs.'))
        }
        // Check: user must be the creator OR have ManageGuild permission
        const row = await pg.db.oneOrNone(
          'SELECT ${userId~} FROM ${db#} WHERE ${guildId~} = ${guildIdValue} AND ${name~} = ${nameValue}',
          {
            userId: SAVED_COMMANDS_COLUMNS.user_id,
            db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
            guildId: SAVED_COMMANDS_COLUMNS.guild_id,
            guildIdValue: interaction.guildId,
            name: SAVED_COMMANDS_COLUMNS.name,
            nameValue: name
          })
        if (!row) {
          return await replyOrFollowUp(interaction, errorEmbed.get(nws`There doesn't seem to be a \
            server-wide saved command by the name of \`${name}\`. Perhaps it already expired after \
            ${SAVED_COMMANDS_EXPIRE_AFTER} of not being used? You can also try listing all \
            saved commands via the \`/listSaved\` command.`))
        }
        const isCreator = row.user_id === interaction.user.id
        const hasManageGuild = interaction.memberPermissions &&
          interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)
        if (!isCreator && !hasManageGuild) {
          return await replyOrFollowUp(interaction, errorEmbed.get(nws`Only the creator of a \
            server-wide saved command or a member with the **Manage Server** permission can delete it.`))
        }

        const result = await pg.db.oneOrNone(
          'DELETE FROM ${db#} WHERE ${guildId~} = ${guildIdValue} AND ${name~} = ${nameValue} ' +
          'RETURNING *', {
            db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
            guildId: SAVED_COMMANDS_COLUMNS.guild_id,
            guildIdValue: interaction.guildId,
            name: SAVED_COMMANDS_COLUMNS.name,
            nameValue: name
          })
        if (!result) {
          return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to delete the \
            server command. Please try again.`))
        }
        Client.invalidateSavedCmdNamesCache(interaction.user.id)
        Client.invalidateGuildSavedCmdNamesCache(interaction.guildId)
        return await replyOrFollowUp(interaction, commonReplyEmbed.get(`Success`,
          nws`The \`${name}\` server-wide saved command has been successfully deleted.`))
      } else {
        // Personal delete (scope === 'personal' or null)
        const result = await pg.db.oneOrNone(
          'DELETE FROM ${db#} WHERE ${userId~} = ${userIdValue} AND ${name~} = ${nameValue} ' +
          'AND ${guildId~} IS NULL RETURNING *', {
            db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
            userId: SAVED_COMMANDS_COLUMNS.user_id,
            userIdValue: interaction.user.id,
            guildId: SAVED_COMMANDS_COLUMNS.guild_id,
            name: SAVED_COMMANDS_COLUMNS.name,
            nameValue: name
          })
        if (!result) {
          return await replyOrFollowUp(interaction, errorEmbed.get(nws`You don't seem to have a \
            saved command by the name of \`${name}\`. Perhaps it already expired after \
            ${SAVED_COMMANDS_EXPIRE_AFTER} of not being used? You can also try listing all your \
            saved commands via the \`/listSaved\` command.`))
        }
        Client.invalidateSavedCmdNamesCache(interaction.user.id)
        return await replyOrFollowUp(interaction, commonReplyEmbed.get(`Success`,
          nws`The \`${name}\` saved command has been successfully deleted from the \
          list of your saved commands.`))
      }
    } catch (error) {
      logger.error(`Failed to delete a saved command`, error)
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Failed to delete the command. \
        Please contact the author of this bot.`))
    }
  } else {
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`You have to enter the name of the \
      command you want to delete.\nIf you do not remember the name, you can use the \`/listSaved\` \
      command to get the list of all your saved commands.`))
  }
}