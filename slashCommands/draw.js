const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/draw')
const logger = require('../helpers/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('draw')
    .setNameLocalization('ru', 'вытяни')
    .setDescription('Draws a number of random cards from the deck that was previously shuffled for this channel')
    .setDescriptionLocalization('ru',
      'Вытягивает случайные карты из колоды, перетасованной для этого канала')
    .addIntegerOption(option => option
      .setName('number_of_cards_to_draw')
      .setNameLocalization('ru', 'количество')
      .setDescription('How many cards should be drawn (1 by default)')
      .setDescriptionLocalization('ru', 'Сколько карт вытянуть (1 по умолчанию)')
    )
    .addStringOption(option => option
      .setName('comment')
      .setNameLocalization('ru', 'комментарий')
      .setDescription('Write a comment (optional)')
      .setDescriptionLocalization('ru', 'Напишите комментарий (опционально)')
    )
    .addBooleanOption(option => option
      .setName('is_private')
      .setNameLocalization('ru', 'приватные_результаты')
      .setDescription('Send the result of the draw to your DMs instead of this channel?')
      .setDescriptionLocalization('ru', 'Отправить результат в ваши ЛС вместо общего канла?')
    )
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in draw commandHandler')
      return
    }

    const numberOfCardsToDraw = interaction.options.getInteger('number_of_cards_to_draw')
    const comment = interaction.options.getString('comment')
    const isPrivate = interaction.options.getBoolean('is_private')

    await interaction.deferReply()
    return await handler(interaction, { numberOfCardsToDraw, comment, isPrivate })
  }
}