const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/order')
const logger = require('../helpers/logger')
const { modal } = require('../modals/orderModal')

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

    const items = interaction.options.getString('items')
    const type = interaction.options.getString('type')

    if (!items) {
      return interaction.showModal(modal)
    }

    await interaction.deferReply()
    return await handler(interaction, { items, type })
  }
}