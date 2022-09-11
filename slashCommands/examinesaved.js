const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/examinesaved')
const logger = require('../helpers/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('examinesaved')
    .setNameLocalization('ru', 'покажикоманду')
    .setDescription('Provides the information about one of your saved commands')
    .setDescriptionLocalization('ru',
      'Предоставляет информацию об одной из ваших сохранённых команд')
    .addStringOption(option => option
      .setName('name')
      .setNameLocalization('ru', 'имя')
      .setDescription('Select the command by name')
      .setDescriptionLocalization('ru', 'Выберите команду по имени')
      .setRequired(true)
      .setAutocomplete(true)
    )
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in examinesaved commandHandler')
      return
    }

    const name = interaction.options.getString('name')

    await interaction.deferReply()
    return await handler(interaction, { name })
  }
}