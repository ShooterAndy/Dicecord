const Client = require('./client')
const { DO_NOT_REPLY_ROLE_NAME } = require('./constants')

module.exports = (message) => {
  if (message && message.guild) {
    return !message.guild.member(Client.client.user).roles.cache.array().find(
      (role) => role.name === DO_NOT_REPLY_ROLE_NAME)
  }
  return false
}