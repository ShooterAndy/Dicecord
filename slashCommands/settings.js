const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const handler = require('../commandHandlers/settings')
const logger = require('../helpers/logger')
const retryable = require('../helpers/retryableDiscordRequest')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setNameLocalization('ru', 'настройки')
    .setDescription('Configure per-server bot settings (admin only)')
    .setDescriptionLocalization('ru',
      'Настройка параметров бота для сервера (только для администраторов)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option => option
      .setName('setting')
      .setNameLocalization('ru', 'параметр')
      .setDescription('The setting to change')
      .setDescriptionLocalization('ru', 'Параметр для изменения')
      .setRequired(true)
      .addChoices(
        { name: 'Plain text mode (no embeds)', value: 'plain_text' }
      )
    )
    .addBooleanOption(option => option
      .setName('enabled')
      .setNameLocalization('ru', 'включено')
      .setDescription('Enable or disable the setting')
      .setDescriptionLocalization('ru', 'Включить или выключить параметр')
      .setRequired(true)
    )
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in settings commandHandler')
      return
    }

    const setting = interaction.options.getString('setting')
    const enabled = interaction.options.getBoolean('enabled')

    await retryable(() => interaction.deferReply())
    return await handler(interaction, { setting, enabled })
  }
}

