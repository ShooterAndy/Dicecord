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
                const responses = await Client.client.shard.broadcastEval(replyToMessage,
                    { context: { message, messageText: part, flags } })
                if (!responses || !responses.length) {
                    throw 'Empty response from replyToMessage broadcastEval'
                }
                for (const response of responses) {
                    if (response) {
                        if (typeof response === 'string') {
                            throw 'Error response from replyToMessage broadcastEval: ' + response
                        }
                        messages.push(response)
                    }
                }
                isFirst = false
            } else {
                const responses = await Client.client.shard.broadcastEval(sendToChannel,
                    { context: { channelId: message.channel.id, messageText: part, flags } })
                if (!responses || !responses.length) {
                    throw 'Empty response from sendToChannel broadcastEval'
                }
                for (const response of responses) {
                    if (response) {
                        if (typeof response === 'string') {
                            throw 'Error response from sendToChannel broadcastEval: ' + response
                        }
                        messages.push(response)
                    }
                }
            }
        }
        return messages
    } catch (err) {
        throw err
    }
}