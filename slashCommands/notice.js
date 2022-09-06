const { SlashCommandBuilder } = require('@discordjs/builders')
const logger = require('../helpers/logger')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')
const nws = require('../helpers/nws')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notice')
    .setNameLocalization('ru', 'нотификация')
    .setDescription('Shows important notices about Dicecord')
    .setDescriptionLocalization('ru',
      'Отображает важные оповещения о Dicecord')
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in notice commandHandler')
      return
    }

    return await interaction.reply(commonReplyEmbed.get('Important notice',
      nws`No special notices.`))
  }
}