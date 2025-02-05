const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/shuffle')
const logger = require('../helpers/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setNameLocalization('ru', 'перетасуй')
    .setDescription('Shuffles a deck of cards and saves it to be used on this channel')
    .setDescriptionLocalization('ru',
      'Тасует колоду карт и сохраняет её для использования на этом канале')
    .addStringOption(option => option
      .setName('deck')
      .setNameLocalization('ru', 'колода')
      .setDescription('Specify the deck type (poker by default)')
      .setDescriptionLocalization('ru', 'Выберите тип колоды (poker по умолчанию)')
      .setAutocomplete(true)
    )
    .addStringOption(option => option
      .setName('custom_cards')
      .setNameLocalization('ru', 'список_карт')
      .setDescription('If you want to shuffle a custom deck, please list the cards you want here, separated by commas')
      .setDescriptionLocalization('ru', 'Чтобы перетасовать специальную колоду, перечислите желаемые карты здесь, разделяя их запятыми')
    )
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in shuffle commandHandler')
      return
    }

    const deckId = interaction.options.getString('deck')
    const customCards = interaction.options.getString('custom_cards')

    await interaction.deferReply()
    return await handler(interaction, { deckId, customCards })
  }
}