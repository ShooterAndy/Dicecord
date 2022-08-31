const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/drawShuffled')
const logger = require('../helpers/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('drawshuffled')
    .setNameLocalization('ru', 'вытянизсвежейколоды')
    .setDescription('Draws a number of random cards from a freshly-shuffled deck without saving the resulting deck')
    .setDescriptionLocalization('ru',
      'Вытягивает случайные карты из свежеперетасованной колоды и не сохраняет её')
    .addStringOption(option => option
      .setName('deck')
      .setNameLocalization('ru', 'колода')
      .setDescription('Specify the deck type (poker by default)')
      .setDescriptionLocalization('ru', 'Выберите тип колоды (poker по умолчанию)')
      .setAutocomplete(true)
    )
    .addIntegerOption(option => option
      .setName('amount')
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
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in drawShuffled commandHandler')
      return
    }

    const deckId = interaction.options.getString('deck')
    const numberOfCardsToDraw = interaction.options.getInteger('amount')
    const comment = interaction.options.getString('comment')

    return await handler(interaction, { deckId, numberOfCardsToDraw, comment })
  }
}