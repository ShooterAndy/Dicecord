const Client = require('./client')
const { USE_INTERACTIVE_REACTIONS, NO_REACTIONS_ROLE_NAME } = require('./constants')

module.exports = async (entity) => {
  if (entity && USE_INTERACTIVE_REACTIONS) {
    if (entity.guild) {
      const guildMember = await entity.guild.members.fetch(Client.client.user)
      if (guildMember) {
        return !guildMember.roles.cache.find(
            (role) => role.name === NO_REACTIONS_ROLE_NAME)
      }
      return false
    } else if (entity.guildID || entity.guildId) {
      const id = entity.guildID || entity.guildId
      const guild = Client.client.guilds.cache.find(g => g.id === id)
      if (guild) {
        return !guild.member(Client.client.user).roles.cache.find(
          (role) => role.name === NO_REACTIONS_ROLE_NAME)
      }
    } else {
      return true
    }
  }
  return false
}