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
    const responses = await Client.client.shard.broadcastEval(_reactToMessage,
        { context: { messageObject, reaction } })
    if (!responses || !responses.length) {
        throw 'Empty response from reactToMessage broadcastEval'
    }
    for (const response of responses) {
        if (response) {
            if (typeof response === 'string') {
                throw 'Error response from reactToMessage broadcastEval: ' + response
            }
            return response
        }
    }
}