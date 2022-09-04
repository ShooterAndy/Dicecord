const { SlashCommandBuilder } = require('@discordjs/builders')
const handler = require('../commandHandlers/listDeckTypes')
const logger = require('../helpers/logger')
const { CommandInteraction} = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('execute')
    .setNameLocalization('ru', 'исполни')
    .setDescription('Loads and executes a previously saved command')
    .setDescriptionLocalization('ru',
      'Загружает и исполняет сохранённую команду')
  ,
  async execute(interaction) {
    if (!interaction) {
      logger.error('No interaction in execute commandHandler')
      return
    }

    const newInteraction = new CommandInteraction(interaction.client, {
      channel_id: interaction.channel_id,
      guild_id: interaction.guild_id,
      user: interaction.user,
      type: interaction.type,
      commandName: 'roll',
      options: {
        data: [
          {
            name: 'roll_command',
            value: '1d20+3?Hey'
          }
        ]
      }
    })
    return await newInteraction.followUp('test')
    //return await handler(interaction, { })
  }
}