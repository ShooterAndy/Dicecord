const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/roll')
const logger = require('../helpers/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setNameLocalization('ru', 'брось')
    .setDescription('Rolls dice')
    .setDescriptionLocalization('ru',
      'Бросает кубики')
    .addStringOption(option => option
      .setName('roll_command')
      .setNameLocalization('ru', 'команда_броска')
      .setDescription('Roll command text (see /help roll for details)')
      .setDescriptionLocalization('ru', 'Текст команды броска (см. /help roll для подбробностей)')
      .setRequired(true)
    )
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in roll commandHandler')
      return
    }

    const commandText = interaction.options.getString('roll_command')

    return await handler(interaction, { commandText })
  }
}