module.exports = async (client, { channelId, messageText, flags }) => {
  const channel = await client.channels.fetch(channelId).catch(err => {
    return `--> ERROR: Failed to fetch channel "${channelId}" in sendToChannel:\n${err}`
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