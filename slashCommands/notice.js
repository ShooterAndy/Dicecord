const { SlashCommandBuilder } = require('@discordjs/builders')
const logger = require('../helpers/logger')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')
const nws = require('../helpers/nws')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')

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

    await interaction.deferReply()
    return await replyOrFollowUp(interaction, commonReplyEmbed.get('Important notice',
      nws`No special notices.`))
  }
}