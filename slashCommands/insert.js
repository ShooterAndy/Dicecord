const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/insert')
const logger = require('../helpers/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insert')
    .setNameLocalization('ru', 'вложи')
    .setDescription('Inserts the specified cards at random into the deck that was previously shuffled for this channel.')
    .setDescriptionLocalization('ru',
      'Случайным образом вкладывает указанные карты в перетасованную для этого канала колоду.')
    .addStringOption(option => option
      .setName('cards')
      .setNameLocalization('ru', 'карты')
      .setDescription('List the cards you want to insert (separate them by commas)')
      .setDescriptionLocalization('ru', 'Перечислите карты (разделите их запятыми)')
      .setRequired(true)
    )
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in insert commandHandler')
      return
    }

    const cards = interaction.options.getString('cards')

    return await handler(interaction, { cards })
  }
}