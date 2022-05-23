const Discord = require('discord.js')
const splitMessage = require('./splitMessage')
const sendToChannel = require('./sendToChannel')
const Client = require('./client');

const replyToMessage = async (client, { message, messageText, flags }) => {
    return await message.reply(messageText, { flags })
}

module.exports = async (text, message, shouldSuppressEmbeds) => {
    if (!text) {
        throw `No text in reply function call`
    }
    if (!message) {
        throw `No message in reply function call for text "${text}"`
    }
    try {
        const parts = splitMessage(text)
        const messages = [];
        let isFirst = true
        for (const part of parts) {
            const flags = new Discord.MessageFlags();
            if (shouldSuppressEmbeds) {
                flags.add(Discord.MessageFlags.FLAGS.SUPPRESS_EMBEDS)
            }
            if (isFirst) {
                const response = await Client.client.shard.broadcastEval(replyToMessage,
                    { context: { message, messageText: part, flags } })
                if (!response || !response.length) {
                    throw 'Empty response from replyToMessage broadcastEval'
                }
                if (typeof response[0] === 'string') {
                    throw 'Error response from replyToMessage broadcastEval: ' + response[0]
                }
                if (response.length > 1) {
                    throw 'More than one response from replyToMessage broadcastEval'
                }
                messages.push(response[0])
                isFirst = false
            } else {
                const response = await Client.client.shard.broadcastEval(sendToChannel,
                    { context: { channelId: message.channel.id, messageText: part, flags } })
                if (!response || !response.length) {
                    throw 'Empty response from sendToChannel broadcastEval'
                }
                if (typeof response[0] === 'string') {
                    throw 'Error response from sendToChannel broadcastEval: ' + response[0]
                }
                if (response.length > 1) {
                    throw 'More than one response from sendToChannel broadcastEval'
                }
                messages.push(response[0])
            }
        }
        return messages
    } catch (err) {
        throw err
    }
}