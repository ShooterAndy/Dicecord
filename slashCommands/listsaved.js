const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/listsaved')
const logger = require('../helpers/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listsaved')
    .setNameLocalization('ru', 'покажикоманды')
    .setDescription('Provides the list of your saved commands')
    .setDescriptionLocalization('ru',
      'Отображает список ваших сохранённых команд')
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in listsaved commandHandler')
      return
    }

    await interaction.deferReply()
    return await handler(interaction, { })
  }
}