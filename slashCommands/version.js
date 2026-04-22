const { SlashCommandBuilder } = require('@discordjs/builders')
const logger = require('../helpers/logger')
const handler = require('../commandHandlers/version')
const retryable = require('../helpers/retryableDiscordRequest')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('version')
    .setNameLocalization('ru', 'версия')
    .setDescription('Shows the current bot version and recent changes')
    .setDescriptionLocalization('ru',
      'Показывает текущую версию бота и последние изменения')
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in version commandHandler')
      return
    }

    await retryable(() => interaction.deferReply())
    return await handler(interaction)
  }
}

