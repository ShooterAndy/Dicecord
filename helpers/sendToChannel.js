module.exports = async (client, { channelId, messageText, flags }) => {
  const logger = require.main.require('./helpers/logger.js')
  const channel = await client.channels.fetch(channelId).catch(err => {
    return logger.error(`Failed to fetch channel "${channelId}" in sendToChannel`, err)
  })
  if (channel) {
    if (channel.isText()) {
      return await channel.send(messageText, { flags }).catch(err => {
        return logger.error('Failed to send a message in sendToChannel', err)
      })
    } else {
      return logger.error(`Attempted to send message to non-text channel "${channelId}"`)
    }
  }
  return null
}