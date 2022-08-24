const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/pick')
const logger = require('../helpers/logger')
const { modal } = require('../modals/pickModal')

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

    const itemsText = interaction.options.getString('items')
    const amountText = interaction.options.getInteger('amount')
    const showRemaining = interaction.options.getBoolean('show_remaining')

    if (!itemsText) {
      return await interaction.showModal(modal)
    }

    return await handler(interaction, { itemsText, amountText, showRemaining })
  }
}