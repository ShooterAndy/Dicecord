const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/examineDeck')
const logger = require('../helpers/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('examinedeck')
    .setNameLocalization('ru', 'покажиколоду')
    .setDescription('Provides the information about a specific deck type')
    .setDescriptionLocalization('ru',
      'Предоставляет информацию о конкретном типе колоды')
    .addStringOption(option => option
      .setName('deck')
      .setNameLocalization('ru', 'колода')
      .setDescription('Specify the deck type')
      .setDescriptionLocalization('ru', 'Выберите тип колоды')
      .setRequired(true)
      .setAutocomplete(true))
    .addBooleanOption(option => option
      .setName('should_show_cards')
      .setNameLocalization('ru', 'показать_карты')
      .setDescription('Show the full ist of cards in that deck type?')
      .setDescriptionLocalization('ru', 'Показать полный список карт в этом типе колоды?')
    )
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in examinedeck commandHandler')
      return
    }

    const deckId = interaction.options.getString('deck')
    const shouldShowCards = interaction.options.getBoolean('should_show_cards')

    return await handler(interaction, { deckId, shouldShowCards })
  }
}