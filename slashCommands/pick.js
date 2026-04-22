const { SlashCommandBuilder } = require('@discordjs/builders')
const { ModalBuilder } = require('discord.js')
const handler = require('../commandHandlers/pick')
const logger = require('../helpers/logger')
const { modal } = require('../modals/pickModal')
const {transformMinutesToMs} = require('../helpers/utilities')
const retryable = require('../helpers/retryableDiscordRequest')
const pendingInteractions = require('../helpers/pendingInteractions')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pick')
    .setNameLocalization('ru', 'выбери')
    .setDescription('Picks one or more random items from a comma-separated-list')
    .setDescriptionLocalization('ru',
      'Выбирает один или несколько случайных элементов из списка разделённых запятыми элементов')
    .addStringOption(option => option
      .setName('items')
      .setNameLocalization('ru', 'список')
      .setDescription('Comma-separated list of elements to pick from')
      .setDescriptionLocalization('ru', 'Список разделённых запятыми элементов')
    )
    .addIntegerOption(option => option
      .setName('amount')
      .setNameLocalization('ru', 'количество')
      .setDescription('How many items should be picked from the list (1 by default)')
      .setDescriptionLocalization('ru', 'Сколько элементов из списка выбрать (1 по умолчанию)')
    )
    .addBooleanOption(option => option
      .setName('show_remaining')
      .setNameLocalization('ru', 'показывать_остаток')
      .setDescription('List the un-picked items as well?')
      .setDescriptionLocalization('ru', 'Показать и невыбранные элементы?')
    )
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in pick commandHandler')
      return
    }

    let items = interaction.options.getString('items')
    let amount = interaction.options.getInteger('amount')
    let showRemaining = interaction.options.getBoolean('show_remaining')

    if (!items) {
      // Unique customId per invocation prevents two concurrent /pick modals
      // from the same user racing on the same submission
      const uniqueId = `pickModal-${interaction.id}`
      const uniqueModal = new ModalBuilder(modal.toJSON()).setCustomId(uniqueId)
      await retryable(() => interaction.showModal(uniqueModal))
      const submitted = await pendingInteractions.wait(uniqueId, {
        time: transformMinutesToMs(10),
        filter: mi => mi.customId === uniqueId && mi.user.id === interaction.user.id,
        type: 'modal'
      })

      if (submitted) {
        items = submitted.fields.getTextInputValue('items')
        amount = submitted.fields.getTextInputValue('amount')
        if (amount) {
          amount = Number.parseInt(amount)
        } else {
          amount = undefined
        }
        const showRemainingValues = submitted.fields.getTextInputValue('show_remaining')
        showRemaining = !!showRemainingValues
        await retryable(() => submitted.deferReply()).catch(error => {
          logger.error(`Failed to deferReply for modal submission in pick`, error)
        })
        return await handler(submitted,
          { items, amount, showRemaining, originalInteraction: interaction })
      }
    } else {
      await retryable(() => interaction.deferReply()).catch(error => {
        logger.error(`Failed to deferReply in pick`, error)
      })
      return await handler(interaction, { items, amount, showRemaining })
    }
  }
}