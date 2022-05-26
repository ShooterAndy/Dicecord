const handleBroadcastEval = require('./handleBroadcastEval')
const Client = require('./client')

const _fetchMessageByIdAndChannelId = async (client, { channelId, messageId }) => {
  let channel
  try {
    channel = await client.channels.fetch(channelId)
  } catch (error) {
    return 'Failed to fetch channel in _fetchMessageByIdAndChannelId' +
      (error && error.message ? `: ${error.message}` : '')
  }
  if (channel) {
    if (channel.isText()) {
      let message
      try {
        message = await channel.messages.fetch(messageId)
      } catch (error) {
        return 'Failed to fetch a message in _fetchMessageByIdAndChannelId' +
          (error && error.message ? `: ${error.message}` : '')
      }
      if (!message) {
        return 'Empty message fetched in _fetchMessageByIdAndChannelId'
      }
      return message
    } else {
      return `Attempted to fetch a message from a non-text channel "${channelId}" in _fetchMessageByIdAndChannelId`
    }
  }
  return null
}
const fetchMessageByIdAndChannelId = async (channelId, messageId) => {
  return await handleBroadcastEval(Client.client.cluster, _fetchMessageByIdAndChannelId, {
    context: { channelId, messageId }
  })
}

const _fetchChannelById = async (client, { channelId }) => {
  let channel
  try {
    channel = await client.channels.fetch(channelId)
  } catch (error) {
    return 'Failed to fetch channel in _fetchChannelById' +
      (error && error.message ? `: ${error.message}` : '')
  }
  if (channel) {
    return channel
  }
  return null
}
const fetchChannelById = async (channelId) => {
  return await handleBroadcastEval(Client.client.cluster, _fetchChannelById, { context: { channelId } })
}

module.exports = {
  fetchMessageByIdAndChannelId,
  fetchChannelById
}