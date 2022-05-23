module.exports = async (client, { channelId, messageText, flags }) => {
    const channel = await client.channels.fetch(channelId)
    if (channel) {
        if (channel.isText()) {
            return await channel.send(messageText, { flags })
        } else {
            return `Attempted to send message to non-text channel "${channelId}"`
        }
    }
}