const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/executeSaved')
const logger = require('../helpers/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('executesaved')
    .setNameLocalization('ru', 'выполникоманду')
    .setDescription('Executes one of your saved commands')
    .setDescriptionLocalization('ru',
      'Выполняет одну из ваших сохранённых команд')
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
      logger.error('No interaction in executesaved commandHandler')
      return
    }

    const name = interaction.options.getString('name')

    await interaction.deferReply()
    return await handler(interaction, { name })
  }
}