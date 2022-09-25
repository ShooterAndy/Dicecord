const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/pick')
const logger = require('../helpers/logger')
const { modal } = require('../modals/pickModal')
const {transformMinutesToMs} = require('../helpers/utilities')

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
      await interaction.showModal(modal)
      const submitted = await interaction.awaitModalSubmit({
        // Timeout after a minute of not receiving any valid Modals
        time: transformMinutesToMs(1),
        // Make sure we only accept Modals from the User who sent the original Interaction we're responding to
        filter: mi => mi.user.id === interaction.user.id,
      }).catch(error => {
        // Catch any Errors that are thrown (e.g. if the awaitModalSubmit times out after 60000 ms)
        if (!error ||
          error.message !== 'Collector received no interactions before ending with reason: time') {
          logger.error('Failed to create pick modal', error)
        }
        return null
      })

      if (submitted) {
        items = submitted.fields.getTextInputValue('items')
        amount = submitted.fields.getTextInputValue('amount')
        if (amount) {
          amount = Number.parseInt(amount)
        } else {
          amount = undefined
        }
        showRemaining = !!submitted.fields.getTextInputValue('show_remaining')
        await submitted.deferReply().catch(error => {
          logger.error(`Failed to deferReply for modal submission in pick`, error)
        })
      }
    } else {
      await interaction.deferReply().catch(error => {
        logger.error(`Failed to deferReply in pick`, error)
      })
    }

    return await handler(interaction, { items, amount, showRemaining })
  }
}