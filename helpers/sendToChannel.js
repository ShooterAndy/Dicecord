const logger = require('./logger')
const nws = require('./nws')
module.exports = async (client, { channelId, messageText, flags }) => {
  const channel = await client.channels.fetch(channelId).catch(err => {
    logger.error(nws`Failed to fetch channel ${channelId} in sendToChannel`,
      err)
    return null
  })
  if (channel) {
    if (channel.isText()) {
      return await channel.send(messageText, { flags })
    } else {
      return `Attempted to send message to non-text channel "${channelId}"`
    }
  }
  return null
}