const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/help')
const logger = require('../helpers/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setNameLocalization('ru', 'помощь')
    .setDescription('Provides documentation for the bot or a specific command')
    .setDescriptionLocalization('ru',
      'Предоставляет документацию о боте или конкретной команде')
    .addStringOption(option => option
      .setName('topic')
      .setNameLocalization('ru', 'команда')
      .setDescription('Specify the command')
      .setDescriptionLocalization('ru', 'Выберите команду')
      .setAutocomplete(true)
    )
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in help commandHandler')
      return
    }

    const topic = interaction.options.getString('topic')

    await interaction.deferReply()
    return await handler(interaction, { topic })
  }
}