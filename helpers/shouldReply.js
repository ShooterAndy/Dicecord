const Client = require('./client')
const { DO_NOT_REPLY_ROLE_NAME } = require('./constants')

module.exports = async (message) => {
  if (message && message.guild) {
    const guildMember = await message.guild.members.fetch(Client.client.user)
    if (guildMember) {
      return !guildMember.roles.cache.find(
          (role) => role.name === DO_NOT_REPLY_ROLE_NAME)
    }
    return false
  }
  return false
}