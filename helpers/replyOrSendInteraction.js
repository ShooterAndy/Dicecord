const { fetchChannelById } = require('./commonBroadcasts')
const logger = require('./logger')
const Client = require('./client')
const sendDM = require('./sendDM')
const nws = require('./nws')

const sendMessage = async (interaction, content) => {
  // Just to be safe...
  let channel = interaction.channel
  if (!channel || !channel.send || (typeof channel.send !== 'function')) {
    channel = await fetchChannelById(interaction.channelId)
  }
  if (!channel) {
    throw 'Channel not found'
  }
  if (!channel.isText()) {
    throw 'Attempted to sendMessage in a non-text channel'
  }

  if (interaction.channel && interaction.guild) { // Do we even have a permission to reply?
    const me = await interaction.guild.members.fetch(Client.client.user.id)
    if (!interaction.channel.permissionsFor(me).has('SEND_MESSAGES')) {
      try {
        await sendDM(nws`Hi! I've tried to respond to your command on channel ${channel.name} \
        of guild ${channel.guild.name}, but it seems that I am missing the "Send Messages" permission for it. \
        Please contact the administrator of that guild so that they can add this permission.`, interaction)
        return null
      } catch (error) {
        throw `Failed to send a DM (due to missing Send permission) in replyOrSendInteraction function call:\n${error}`
      }
    }
    if (!interaction.channel.permissionsFor(me).has('READ_MESSAGE_HISTORY')) {
      try {
        await sendDM(nws`Hi! I've tried to respond to your command on channel ${channel.name} \
        of guild ${channel.guild.name}, but it seems that I am missing the "Read Message History" permission for it. \
        Please contact the administrator of that guild so that they can add this permission.`, interaction)
        return null
      } catch (error) {
        throw `Failed to send a DM (due to missing Read permission) in replyOrSendInteraction function call:\n${error}`
      }
    }
  }

  return await channel.send(content).catch(err => { throw err })
}

module.exports = async (interaction, content) => {
  if (interaction) {
    if (interaction.isRepliable() && !interaction.replied) {
      content.fetchReply = true
      return await interaction.reply(content)
        .catch(e => logger.error('Failed to reply to an interaction', e))
    } else {
      try {
        return await sendMessage(interaction, content)
      } catch (e) {
        logger.error('Failed to send a message in replyOrSendInteraction', e)
      }
    }
  } else {
    try {
      return await sendMessage(interaction, content)
    } catch (e) {
      logger.error('Failed to send a message in replyOrSendInteraction', e)
    }
  }
}