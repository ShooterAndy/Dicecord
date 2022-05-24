const Discord = require('discord.js')
const splitMessage = require('./splitMessage')
const sendToChannel = require('./sendToChannel')
const Client = require('./client')

const replyToMessage = async (client, { messageObject, messageText, flags }) => {
    if (messageObject && messageObject.id && messageObject.channelId) {
        const channel = await client.channels.fetch(messageObject.channelId)
        if (channel) {
            if (channel.isText()) {
                const message = await channel.messages.fetch(messageObject.id)
                try {
                    return await message.reply({content: messageText, flags})
                } catch (err) {
                    console.error('-- > Error in replyToMessage: ', (err ? JSON.stringify(err) : null))
                }
            } else {
                return `Attempted to send message to non-text channel "${messageObject.channelId}"`
            }
        }
        return null
    }
    return null
}

module.exports = async (text, message, shouldSuppressEmbeds) => {
    try {
        if (!text) {
            throw `No text in reply function call`
        }
        if (!message) {
            throw `No message in reply function call for text "${text}"`
        }
        const parts = splitMessage(text)
        const messages = []
        let isFirst = true
        for (const part of parts) {
            const flags = new Discord.MessageFlags()
            if (shouldSuppressEmbeds) {
                flags.add(Discord.MessageFlags.FLAGS.SUPPRESS_EMBEDS)
            }
            if (isFirst) {
                if (message.guildId) {
                    const responses = await Client.client.cluster.broadcastEval(replyToMessage,
                        { context: { messageObject: message, messageText: part, flags } })
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
                } else { // It's a DM
                    messages.push(await message.reply({ content: part, flags }))
                }
                isFirst = false
            } else {
                if (messages.guildId) {
                    const responses = await Client.client.cluster.broadcastEval(sendToChannel,
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
                } else { // It's a DM
                    const response = await message.channel.send({ content: part, flags })
                    messages.push(response)
                }
            }
        }
        return messages
    } catch (err) {
        const logger = require('./logger')
        logger.error('Error in reply', err)
    }
}