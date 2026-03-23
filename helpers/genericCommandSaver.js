const logger = require('./logger')
const { transformMinutesToMs } = require('./utilities')
const {
  SAVE_BUTTON_EXPIRE_AFTER_INT,
  GENERIC_SAVE_BUTTON_ID,
  GENERIC_GUILD_SAVE_BUTTON_ID,
  MAX_SAVED_COMMAND_NAME_LENGTH,
  MAX_SAVED_COMMANDS_PER_USER,
  MAX_GUILD_SAVED_COMMANDS_PER_USER,
  UPSERT_SAVED_COMMAND_RESULTS,
  SAVED_COMMANDS_EXPIRE_AFTER,
  SAVED_COMMANDS_DB_NAME,
  SAVED_COMMANDS_COLUMNS
} = require('./constants')
const { TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalBuilder, InteractionCollector, ComponentType } = require('discord.js')
const nws = require('./nws')
const errorEmbed = require('./errorEmbed')
const commonReplyEmbed = require('./commonReplyEmbed')
const pg = require('./pgHandler')
const replyOrFollowUp = require('./replyOrFollowUp')
const Client = require('./client')
const retryable = require('./retryableDiscordRequest')
const editMessage = require('./editMessage')

const upsertSavedCommand = async (userId, name, commandName, limit, parametersJson, guildId) => {
  return pg.db.tx(async t => {
    // Advisory lock keyed on the user id to serialize concurrent saves for the same user.
    // This prevents race conditions between the SELECT check and the INSERT.
    // hashtext() returns a stable int4 from any text value.
    await t.any('SELECT pg_advisory_xact_lock(hashtext(${userId}))', { userId })

    const baseParams = {
      db: pg.addPrefix(SAVED_COMMANDS_DB_NAME),
      userId: SAVED_COMMANDS_COLUMNS.user_id,
      userIdValue: userId,
      guildId: SAVED_COMMANDS_COLUMNS.guild_id,
      guildIdValue: guildId,
      name: SAVED_COMMANDS_COLUMNS.name,
      nameValue: name,
      command: SAVED_COMMANDS_COLUMNS.command,
      commandValue: commandName,
      parameters: SAVED_COMMANDS_COLUMNS.parameters,
      parametersValue: parametersJson,
      timestamp: SAVED_COMMANDS_COLUMNS.timestamp
    }

    // 1. Check if a command with this name already exists for this scope
    const existing = guildId
      ? await t.oneOrNone(
          'SELECT 1 FROM ${db#} WHERE ${guildId~} = ${guildIdValue} AND ${name~} = ${nameValue} ' +
          'FOR UPDATE',
          baseParams)
      : await t.oneOrNone(
          'SELECT 1 FROM ${db#} WHERE ${userId~} = ${userIdValue} AND ${name~} = ${nameValue} ' +
          'AND ${guildId~} IS NULL FOR UPDATE',
          baseParams)

    if (existing) {
      // 2. Update the existing command
      if (guildId) {
        await t.none(
          'UPDATE ${db#} SET ${command~} = ${commandValue}, ${parameters~} = ${parametersValue}, ' +
          '${timestamp~} = NOW() WHERE ${guildId~} = ${guildIdValue} AND ${name~} = ${nameValue}',
          baseParams)
      } else {
        await t.none(
          'UPDATE ${db#} SET ${command~} = ${commandValue}, ${parameters~} = ${parametersValue}, ' +
          '${timestamp~} = NOW() WHERE ${userId~} = ${userIdValue} AND ${name~} = ${nameValue} ' +
          'AND ${guildId~} IS NULL',
          baseParams)
      }
      return UPSERT_SAVED_COMMAND_RESULTS.updated
    }

    // 3. Check the count against the limit
    const countResult = guildId
      ? await t.one(
          'SELECT COUNT(*)::INTEGER as count FROM ${db#} ' +
          'WHERE ${userId~} = ${userIdValue} AND ${guildId~} = ${guildIdValue}',
          baseParams)
      : await t.one(
          'SELECT COUNT(*)::INTEGER as count FROM ${db#} ' +
          'WHERE ${userId~} = ${userIdValue} AND ${guildId~} IS NULL',
          baseParams)

    if (countResult.count >= limit) {
      return UPSERT_SAVED_COMMAND_RESULTS.limit
    }

    // 4. Insert the new command
    if (guildId) {
      await t.none(
        'INSERT INTO ${db#} (${userId~}, ${guildId~}, ${name~}, ${command~}, ${parameters~}, ${timestamp~}) ' +
        'VALUES (${userIdValue}, ${guildIdValue}, ${nameValue}, ${commandValue}, ${parametersValue}, NOW())',
        baseParams)
    } else {
      await t.none(
        'INSERT INTO ${db#} (${userId~}, ${name~}, ${command~}, ${parameters~}, ${timestamp~}) ' +
        'VALUES (${userIdValue}, ${nameValue}, ${commandValue}, ${parametersValue}, NOW())',
        baseParams)
    }

    return UPSERT_SAVED_COMMAND_RESULTS.inserted
  })
}

module.exports = {
  async launch(interaction, response, parameters) {
    const filter = i => {
      return (i.customId === GENERIC_SAVE_BUTTON_ID ||
              i.customId === GENERIC_GUILD_SAVE_BUTTON_ID) &&
        (i.user.id === interaction.user.id)
    }

    const collector = new InteractionCollector(interaction.client, {
      filter,
      message: response,
      componentType: ComponentType.Button,
      time: transformMinutesToMs(SAVE_BUTTON_EXPIRE_AFTER_INT)
    })

    collector.on('collect', async i => {
      const isGuildSave = i.customId === GENERIC_GUILD_SAVE_BUTTON_ID
      const guildId = isGuildSave ? interaction.guildId : null

      const nameInput = new TextInputBuilder()
        .setCustomId('name')
        .setLabel(`Name for your saved command`)
        .setPlaceholder(nws`${MAX_SAVED_COMMAND_NAME_LENGTH} characters max, only lowercase latin \
          letters, numbers, underscore, and minus symbols allowed.` )
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
      const nameRow = new ActionRowBuilder().addComponents(nameInput)
      const modalId = `genericSaveModal_${i.id}`
      const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle(isGuildSave ? 'Save command for server?' : 'Save command for you?')
        .addComponents(nameRow)
      await retryable(() => i.showModal(modal))

      const submitted = await interaction.awaitModalSubmit({
        // Timeout after 5 minutes of not receiving any valid Modals
        time: transformMinutesToMs(5),
        // Match BOTH the exact modal instance and the user
        filter: mi => mi.customId === modalId && mi.user.id === interaction.user.id,
      }).catch(error => {
        // Catch any Errors that are thrown (e.g. if the awaitModalSubmit times out after 60000 ms)
        if (!error ||
          error.message !== 'Collector received no interactions before ending with reason: time') {
          logger.error('Failed to create save modal', error)
        }
        return null
      })

      if (submitted) {
        await retryable(() => submitted.deferReply()).catch(error => {
          logger.error(`Failed to deferReply for modal submission in genericCommandSaver`, error)
        })
        let name = submitted.fields.getTextInputValue('name').trim().toLowerCase()
        if (!name) {
          return await replyOrFollowUp(submitted,
            errorEmbed.get(nws`The saved command name cannot be empty.`))
        }
        if (!name.match(/^[a-z0-9\-_]+$/)) {
          return await replyOrFollowUp(submitted, errorEmbed.get(nws`Please use only latin \
            characters, numbers, as well as the \`-\` and \`_\`\ characters in command name.`))
        }
        if (name.length > MAX_SAVED_COMMAND_NAME_LENGTH) {
          return await replyOrFollowUp(submitted, errorEmbed.get(nws`Please pick a name with fewer \
            than ${MAX_SAVED_COMMAND_NAME_LENGTH} characters in it.`))
        }

        await retryable(() => editMessage(interaction.client, response.channelId, response.id, { components: [] }))
          .catch(error => {
            logger.error(`Failed to remove buttons on save button click`, error)
            return null
          })

        const limit = isGuildSave ? MAX_GUILD_SAVED_COMMANDS_PER_USER : MAX_SAVED_COMMANDS_PER_USER

        try {
          const upsertResult = await upsertSavedCommand(
            interaction.user.id,
            name,
            interaction.commandName.toLowerCase(),
            limit,
            JSON.stringify(parameters || interaction.options.data),
            guildId
          )
          if (!upsertResult) {
            logger.error(`The result of upsertSavedCommand appears to be empty`)
            return await replyOrFollowUp(submitted, errorEmbed.get(nws`Failed to save your \
              command. Please contact the author of this bot.`))
          }
          switch (upsertResult) {
            case UPSERT_SAVED_COMMAND_RESULTS.inserted:
            case UPSERT_SAVED_COMMAND_RESULTS.updated: {
              Client.invalidateSavedCmdNamesCache(interaction.user.id)
              if (isGuildSave && guildId) {
                Client.invalidateGuildSavedCmdNamesCache(guildId)
              }
              const isInsert = upsertResult === UPSERT_SAVED_COMMAND_RESULTS.inserted
              const scopeLabel = isGuildSave ? 'server-wide' : 'personal'
              return await replyOrFollowUp(submitted, commonReplyEmbed.get(
                isInsert ? 'Save successful!' : 'Update successful!',
                nws`Your ${scopeLabel} command \`${name}\` was \
                ${isInsert ? 'saved' : 'successfully updated'}! \
                You can use it via:\n\`\`\`/executeSaved name:${name}\`\`\`\nor examine it \
                via:\n\`\`\`/examineSaved name:${name}\`\`\`\nBe \
                aware that your saved commands will expire and be automatically **deleted** after \
                ${SAVED_COMMANDS_EXPIRE_AFTER} of being executed or examined last.`))
            }
            case UPSERT_SAVED_COMMAND_RESULTS.limit: {
              const limitNum = isGuildSave
                ? MAX_GUILD_SAVED_COMMANDS_PER_USER
                : MAX_SAVED_COMMANDS_PER_USER
              const scopeLabel = isGuildSave ? 'server-wide' : 'personal'
              return await replyOrFollowUp(submitted, errorEmbed.get(nws`Unfortunately, you \
              already have ${limitNum} ${scopeLabel} saved commands. You can delete one via \
              \`/deleteSaved\``))
            }
            default: {
              logger.error(`Unknown upsert_saved_command type result`)
              return await replyOrFollowUp(submitted, errorEmbed.get(nws`Failed to save your \
              command. Please contact the author of this bot.`))
            }
          }

        } catch (error) {
          logger.error(`Failed to save a command`, error)
          return await replyOrFollowUp(submitted, errorEmbed.get(nws`Failed to save your command. \
              Please contact the author of this bot.`)).catch(error => {
            logger.error(`Failed to send an error message about failing to save a command`, error)
            return null
          })
        }
      }
    })

    collector.on('end', async () => {
      await retryable(() => editMessage(interaction.client, response.channelId, response.id, { components: [] }))
        .catch(error => {
          logger.error(`Failed to remove buttons on save button timeout`, error)
          return null
        })
    })
  }
}