const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/slots')
const logger = require('../helpers/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setNameLocalization('ru', 'слоты')
    .setDescription('Displays one random slot machine result.')
    .setDescriptionLocalization('ru',
      'Показывает один случайный результат слот-машины.')
    .addIntegerOption(option => option
      .setName('slots_number')
      .setNameLocalization('ru', 'количество_слотов')
      .setDescription('How many slots should your slot machine have (3 by default)?')
      .setDescriptionLocalization('ru', 'Сколько слотов в вашей слот-машине (3 по умолчанию)?')
    )
    .addStringOption(option => option
      .setName('custom_slots')
      .setNameLocalization('ru', 'список_слотов')
      .setDescription('List the symbols you want for your slots to have (separate them by spaces or commas).')
      .setDescriptionLocalization('ru', 'Перечислите символы для ваших слотов (разделите их запятыми или пробелами).')
    )
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in insert commandHandler')
      return
    }

    const slotsNumber = interaction.options.getInteger('slots_number')
    const customSlots = interaction.options.getString('custom_slots')

    await interaction.deferReply()
    return await handler(interaction, { slotsNumber, customSlots })
  }
}