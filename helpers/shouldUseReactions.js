const Client = require('./client')
const logger = require('../helpers/logger')
const { USE_INTERACTIVE_REACTIONS, NO_REACTIONS_ROLE_NAME } = require('./constants')

module.exports = (message) => {
  if (message && USE_INTERACTIVE_REACTIONS) {
    if (message.guild) {
      return !message.guild.member(Client.client.user).roles.cache.array().find(
        (role) => role.name === NO_REACTIONS_ROLE_NAME)
    } else if (message.guildID) {
      const guild = Client.client.guilds.cache.find(g => g.id === message.guildID)
      if (guild) {
        const res =  !guild.member(Client.client.user).roles.cache.array().find(
          (role) => role.name === NO_REACTIONS_ROLE_NAME)
        return res
      }
    }
  }
  return false
}