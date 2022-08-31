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
      nws`**IMPORTANT!**\nAfter August 31, 2022, this bot, as is mandated by Discord, is \
      moving to _Slash Commands_. This means that the typical way of sending messages with a \
      prefix, such as \`!roll 1d20+2\` will **NO LONGER WORK**. Instead, this bot will use \
      the new slash command syntax, so you should type \`/roll\` and then fill the parameters \
      there.\nThere are also some things that will nt work, such as saving and using roll \
      commands, as well as roll command interactivity. These will be included in later \
      updates.\nIf you have any questions, please, don't hesitate to ask them on the bot's \
      support server: https://discord.gg/UPRHn2m`))
  }
}