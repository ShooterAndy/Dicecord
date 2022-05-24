const Discord = require('discord.js')
const splitMessage = require('./splitMessage')
const sendToChannel = require('./sendToChannel')

module.exports = async (text, messageOrChannelId, shouldSuppressEmbeds) => {
    try {
        const Client = require('./client')
        if (!text) {
            throw `No text in send function call`
        }
        if (!messageOrChannelId) {
            throw `No messageOrChannelId in send function call for text "${text}"`
        }
        let message = { }
        let channelId = null
        if (typeof messageOrChannelId === 'string') {
            channelId = messageOrChannelId
        } else {
            message = messageOrChannelId
        }
        if (!channelId && !message.channelId) {
            throw `No channel id in send function call for text "${text}"`
        }
        const parts = splitMessage(text)
        const messages = []
        for (const part of parts) {
            const flags = new Discord.MessageFlags()
            if (shouldSuppressEmbeds) {
                flags.add(Discord.MessageFlags.FLAGS.SUPPRESS_EMBEDS)
            }
            if (channelId || message.guildId) {
                if (!channelId) {
                    channelId = message.channelId
                }
                const responses = await Client.client.cluster.broadcastEval(sendToChannel,
                    { context: { channelId, messageText: part, flags } })
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
        return messages
    } catch (err) {
        const logger = require('./logger')
        logger.error('Error in send', err)
    }
}