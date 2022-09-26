const logger = require('./logger')
const nws = require('./nws')
const Client = require('./client')

module.exports = async (interaction, content) => {
  if (!content) {
    logger.error(`No content in replyOrFollowUp`)
  }
  if (interaction) {
    let channel
    if (!interaction.channel) {
      if (interaction.channelId) {
        if (interaction.inGuild()) {
          // Apparently we need to make sure the guild is cached, otherwise fetching the channel
          // might fail?
          let guild = interaction.guild
          if (!guild) {
            if (!interaction.guildId) {
              logger.error(nws`In-Guild interaction has no guildId in \
              replyOrFollowUp:\n${JSON.stringify(content)}`)
              return null
            }
            guild = await Client.client.guilds.fetch(interaction.guildId).catch(err => {
              logger.error(nws`Failed to fetch guild ${interaction.guildId} in \
              replyOrFollowUp:\n${JSON.stringify(content)}`, err)
              return null
            })
          }
          if (!guild) {
            logger.error(nws`Failed to get guild ${interaction.guildId} in \
            replyOrFollowUp:\n${JSON.stringify(content)}`)
            return null
          }
          const hadGuildHadToBeFetchedText = !interaction.guild ?
            ' (guild had to be fetched)' : ''
          channel = await guild.channels.fetch(interaction.channelId).catch(err => {
            logger.error(nws`Failed to fetch channel ${interaction.channelId} of \
            guild ${interaction.guildId}${hadGuildHadToBeFetchedText} \
            replyOrFollowUp:\n${JSON.stringify(content)}`, err)
            return null
          })
          if (!channel) {
            logger.error(nws`Failed to get channel ${interaction.channelId} of \
            guild ${interaction.guildId}${hadGuildHadToBeFetchedText} \ 
            replyOrFollowUp:\n${JSON.stringify(content)}`)
            return null
          }
        } else { // It's DM then, so I think it should work?
          let client = interaction.client
          if (!client || !client.channels || !client.channels.fetch) {
            client = require('./client').client
          }
          channel = await client.channels.fetch(interaction.channelId).catch(err => {
            logger.error(nws`Failed to fetch channel ${interaction.channelId} in \
            guild-less replyOrFollowUp:\n${JSON.stringify(content)}`, err)
            return null
          })
          if (!channel) {
            logger.error(nws`Failed to get channel ${interaction.channelId} in \
            guild-less replyOrFollowUp:\n${JSON.stringify(content)}`)
            return null
          }
        }
      } else {
        logger.error(nws`Channel is ${interaction.channel} and channelId is \
          ${interaction.channelId} in replyOrFollowUp:\n${JSON.stringify(content)}`)
        return null
      }
    } else {
      channel = interaction.channel
    }
    if ((typeof channel.isText === 'function') && channel.isText()) {
      if (interaction.isRepliable()) {
        if (!interaction.replied) {
          content.fetchReply = true
          try {
            return await interaction.editReply(content)
          } catch (e) {
            logger.error(nws`Failed to reply to an interaction in \
              replyOrFollowUp:\n${JSON.stringify(content)}`, e)
            return null
          }
        } else {
          content.fetchReply = true
          try {
            return await interaction.followUp(content)
          } catch (e) {
            logger.error(nws`Failed to follow up an interaction in \
              replyOrFollowUp:\n${JSON.stringify(content)}`, e)
            return null
          }
        }
      } else {
        logger.error(nws`Tried to reply to an interaction that is not repliable in \
            replyOrFollowUp:\n${JSON.stringify(content)}`)
        return null
      }
    } else {
      if (channel.type === 'GUILD_VOICE') { // This is expected, bug in Discord.js
        return null
      } else {
        logger.error(nws`Malformed channel in \
            replyOrFollowUp:\n${JSON.stringify(interaction.channel)}`)
        return null
      }
    }
  } else {
    logger.error(`No interaction in replyOrFollowUp:\n${JSON.stringify(content)}`)
    return null
  }
}