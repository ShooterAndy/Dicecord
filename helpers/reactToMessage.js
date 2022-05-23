const Client = require('./client')

const _reactToMessage = async (client, { messageObject, reaction }) => {
    if (!reaction) {
        return 'No reaction in reactToMessage'
    }
    if (!messageObject) {
        return 'No messageObject in reactToMessage'
    }
    if (!messageObject.channelId) {
        return 'No channel id in reactTomessage'
    }
    if (!messageObject.id) {
        return 'No message id in reactToMessage'
    }
    const channel = await client.channels.fetch(messageObject.channelId)
    if (!channel) {
        return `Channel ${messageObject.channelId} not found in reactToMessage`
    }
    const message = await channel.messages.fetch(messageObject.id)
    if (!message) {
        return `Message ${messageObject.id} not found in reactToMessage`
    }
    return await message.react(reaction)
}

module.exports = async (messageObject, reaction) => {
    const response = await Client.client.shard.broadcastEval(_reactToMessage,
        { context: { messageObject, reaction } })
    if (!response || !response.length) {
        throw 'Empty response from _reactToMessage broadcastEval'
    }
    if (typeof response[0] === 'string') {
        throw 'Error response from _reactToMessage broadcastEval: ' + response[0]
    }
    if (response.length > 1) {
        throw 'More than one response from _reactToMessage broadcastEval'
    }
    return response[0]
}