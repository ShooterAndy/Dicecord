const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/deal')
const logger = require('../helpers/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deal')
    .setNameLocalization('ru', 'раздай')
    .setDescription('Deals a number of random cards from the deck that was previously shuffled for this channel')
    .setDescriptionLocalization('ru',
      'Раздаёт случайные карты из колоды, перетасованной для этого канала')
    .addIntegerOption(option => option
      .setName('number_of_cards_to_draw')
      .setNameLocalization('ru', 'количество')
      .setDescription('How many cards should be dealt (1 by default)')
      .setDescriptionLocalization('ru', 'Сколько карт раздать (1 по умолчанию)')
    )
    .addStringOption(option => option
      .setName('comment')
      .setNameLocalization('ru', 'комментарий')
      .setDescription('Write a comment (optional)')
      .setDescriptionLocalization('ru', 'Напишите комментарий (опционально)')
    )
    .addStringOption(option => option
      .setName('users_list')
      .setNameLocalization('ru', 'список_пользователей')
      .setDescription('List the users you would like to send the results to (optional)')
      .setDescriptionLocalization('ru', 'Перечислите пользователей, которым вы бы хотели отправить результаты')
    )
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in deal commandHandler')
      return
    }

    const numberOfCardsToDraw = interaction.options.getInteger('number_of_cards_to_draw')
    const comment = interaction.options.getString('comment')
    const usersList = interaction.options.getString('users_list')

    await interaction.deferReply()
    return await handler(interaction, { numberOfCardsToDraw, comment, usersList })
  }
}