const Client = require('./client')
const { USE_INTERACTIVE_REACTIONS, NO_REACTIONS_ROLE_NAME } = require('./constants')

module.exports = async (message) => {
  if (message && USE_INTERACTIVE_REACTIONS) {
    if (message.guild) {
      const guildMember = await message.guild.members.fetch(Client.client.user)
      if (guildMember) {
        return !guildMember.roles.cache.find(
            (role) => role.name === NO_REACTIONS_ROLE_NAME)
      }
      return false
    } else if (message.guildID) {
      const guild = Client.client.guilds.cache.find(g => g.id === message.guildID)
      if (guild) {
        return !guild.member(Client.client.user).roles.cache.find(
          (role) => role.name === NO_REACTIONS_ROLE_NAME)
      }
    }
  }
  return false
}