const { SlashCommandBuilder } = require('@discordjs/builders')
const { ModalBuilder } = require('discord.js')
const handler = require('../commandHandlers/order')
const logger = require('../helpers/logger')
const { modal } = require('../modals/orderModal')
const {transformMinutesToMs} = require('../helpers/utilities')
const retryable = require('../helpers/retryableDiscordRequest')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('order')
    .setNameLocalization('ru', 'упорядочь')
    .setDescription('Randomly orders items in a comma-separated-list')
    .setDescriptionLocalization('ru',
      'Сортирует список разделённых запятыми элементов в случайном порядке')
    .addStringOption(option => option
      .setName('items')
      .setNameLocalization('ru', 'список')
      .setDescription('Comma-separated list of elements to order')
      .setDescriptionLocalization('ru', 'Список разделённых запятыми элементов')
    )
    .addStringOption(option => option
      .setName('type')
      .setNameLocalization('ru', 'тип')
      .setDescription('Type "ul" for bullet-point list, or "ol" for numbered list (optional)')
      .setDescriptionLocalization('ru', '"ul" для ненумерованного списка, "ol" для нумерованного (опционально)')
    )
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in order commandHandler')
      return
    }

    let items = interaction.options.getString('items')
    let type = interaction.options.getString('type')

    if (!items) {
      // Unique customId per invocation prevents two concurrent /order modals
      // from the same user racing on the same submission
      const uniqueId = `orderModal-${interaction.id}`
      const uniqueModal = new ModalBuilder(modal.toJSON()).setCustomId(uniqueId)
      await retryable(() => interaction.showModal(uniqueModal))
      const submitted = await interaction.awaitModalSubmit({
        // Timeout after ten minutes
        time: transformMinutesToMs(10),
        // Make sure we only accept Modals from the User who sent the original Interaction we're responding to
        filter: mi => mi.customId === uniqueId && mi.user.id === interaction.user.id,
      }).catch(error => {
        // Catch any Errors that are thrown (e.g. if the awaitModalSubmit times out after 60000 ms)
        if (!error ||
          error.message !== 'Collector received no interactions before ending with reason: time') {
          logger.error('Failed to create order modal', error)
        }
        return null
      })

      if (submitted) {
        items = submitted.fields.getTextInputValue('items')
        type = submitted.fields.getTextInputValue('type')
        await retryable(() => submitted.deferReply()).catch(error => {
          logger.error(`Failed to deferReply for modal submission in order`, error)
        })
        return await handler(submitted,
          { items, type, originalInteraction: interaction })
      }
    } else {
      await retryable(() => interaction.deferReply()).catch(error => {
        logger.error(`Failed to deferReply in order`, error)
      })
      return await handler(interaction, { items, type })
    }
  }
}