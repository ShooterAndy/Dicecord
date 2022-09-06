const logger = require('./logger')
const { transformMinutesToMs } = require('./utilities')
const {
  SAVE_BUTTON_EXPIRE_AFTER_INT,
  GENERIC_SAVE_BUTTON_ID,
  MAX_SAVED_COMMAND_NAME_LENGTH,
  MAX_SAVED_COMMANDS_PER_USER,
  UPSERT_SAVED_COMMAND_RESULTS,
  SAVED_COMMANDS_EXPIRE_AFTER
} = require('./constants')
const { TextInputComponent, MessageActionRow, Modal} = require('discord.js')
const nws = require('./nws')
const errorEmbed = require('./errorEmbed')
const commonReplyEmbed = require('./commonReplyEmbed')
const pg = require('./pgHandler')

module.exports = {
  launch(interaction, response) {
    const filter = i => {
      return (i.message.id === response.id) &&
        (i.customId === GENERIC_SAVE_BUTTON_ID) &&
        (i.user.id === interaction.user.id)
    }

    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: transformMinutesToMs(SAVE_BUTTON_EXPIRE_AFTER_INT)
    })

    collector.on('collect', async i => {
      const nameInput = new TextInputComponent()
        .setCustomId('name')
        .setLabel(`Name for your saved command`)
        .setPlaceholder(nws`${MAX_SAVED_COMMAND_NAME_LENGTH} characters max, only lowercase latin \
          letters, numbers, underscore, and minus symbols allowed.` )
        .setRequired(true)
        .setStyle('SHORT')
      const nameRow = new MessageActionRow().addComponents(nameInput)
      const modal = new Modal()
        .setCustomId('genericSaveModal')
        .setTitle('Save your command?')
        .addComponents(nameRow)
      await i.showModal(modal)

      const submitted = await interaction.awaitModalSubmit({
        // Timeout after a minute of not receiving any valid Modals
        time: 60000,
        // Make sure we only accept Modals from the User who sent the original Interaction we're responding to
        filter: mi => mi.user.id === interaction.user.id,
      }).catch(error => {
        // Catch any Errors that are thrown (e.g. if the awaitModalSubmit times out after 60000 ms)
        if (!error ||
          error.message !== 'Collector received no interactions before ending with reason: time') {
          logger.error('Failed to create save modal', error)
        }
        return null
      })


      if (submitted) {
        let name = submitted.fields.getTextInputValue('name').trim().toLowerCase()
        if (!name) {
          return await submitted.reply(errorEmbed.get(nws`The saved command name cannot be empty.`))
        }
        if (!name.match(/^[a-z0-9\-_]+$/)) {
          return await submitted.reply(errorEmbed.get(nws`Please use only latin characters, \
            numbers, as well as the \`-\` and \`_\`\ characters in command name.`))
        }
        if (name.length > MAX_SAVED_COMMAND_NAME_LENGTH) {
          return await submitted.reply(errorEmbed.get(nws`Please pick a name with fewer than \
            ${MAX_SAVED_COMMAND_NAME_LENGTH} characters in it.`))
        }

        response.edit({ components: [] })
        try {
          const result = await pg.db.one(
            'SELECT upsert_saved_command(${userId}, ${name}, ${command}, ${limit}, ' +
              '${parameters})',
            {
              userId: interaction.user.id,
              name,
              command: interaction.commandName,
              limit: MAX_SAVED_COMMANDS_PER_USER,
              parameters: JSON.stringify(interaction.options.data)
            })
          if (!result || !result.upsert_saved_command) {
            logger.error(`The result of upsert_saved_command appears to be empty`)
            return await submitted.reply(errorEmbed.get(nws`Failed to save your command. \
              Please contact the author of this bot.`))
          }
          switch (result.upsert_saved_command) {
            case UPSERT_SAVED_COMMAND_RESULTS.inserted: {
              return await submitted.reply(commonReplyEmbed.get('Save successful!',
                nws`Your command \`${name}\` was saved successfully! You can use it via \
                \`/executeSaved\` or examine it via \`/examineSaved\`.\nBe aware that your saved \
                commands will expire and be automatically **deleted** after \
                ${SAVED_COMMANDS_EXPIRE_AFTER} of being executed or examined last.`))
            }
            case UPSERT_SAVED_COMMAND_RESULTS.updated: {
              return await submitted.reply(commonReplyEmbed.get('Update successful!',
                nws`Your command \`${name}\` was successfully updated! You can use it via \
                \`/executeSaved\` or examine it via \`/examineSaved\`.\nBe aware that your saved \
                commands will expire and be automatically **deleted** after \
                ${SAVED_COMMANDS_EXPIRE_AFTER} of being executed or examined last.`))
            }
            case UPSERT_SAVED_COMMAND_RESULTS.limit: {
              return await submitted.reply(errorEmbed.get(nws`Unfortunately, you already have \
              ${MAX_SAVED_COMMANDS_PER_USER} saved commands. You can delete one via \
              \`deleteSaved\``))
            }
            default: {
              logger.error(`Unknown upsert_saved_command type result`)
              return await submitted.reply(errorEmbed.get(nws`Failed to save your command. \
              Please contact the author of this bot.`))
            }
          }

        } catch (error) {
          logger.error(`Failed to save a roll command`, error)
          return await submitted.reply(errorEmbed.get(nws`Failed to save your command. \
              Please contact the author of this bot.`))
        }
      }
    })

    collector.on('end', () => response.edit({ components: [] }))
  }
}