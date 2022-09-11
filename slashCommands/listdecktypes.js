const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/listdecktypes')
const logger = require('../helpers/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listdecktypes')
    .setNameLocalization('ru', 'перечислитипыколод')
    .setDescription('Lists all the available deck types')
    .setDescriptionLocalization('ru',
      'Перечисляет все доступные типы колод')
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in listDeckTypes commandHandler')
      return
    }

    await interaction.deferReply()
    return await handler(interaction, { })
  }
}