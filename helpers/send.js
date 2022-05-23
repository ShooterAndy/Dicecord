const Discord = require('discord.js')
const splitMessage = require('./splitMessage')
const sendToChannel = require('./sendToChannel')

module.exports = async (text, channelId, shouldSuppressEmbeds) => {
    const Client = require('./client')
    if (!text) {
        throw `No text in send function call`
    }
    if (!channelId) {
        throw `No channel id in send function call for text "${text}"`
    }
    try {
        const parts = splitMessage(text)
        const messages = []
        for (const part of parts) {
            const flags = new Discord.MessageFlags()
            if (shouldSuppressEmbeds) {
                flags.add(Discord.MessageFlags.FLAGS.SUPPRESS_EMBEDS)
            }
            const responses = await Client.client.shard.broadcastEval(sendToChannel,
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
        }
        return messages
    } catch (err) {
        const logger = require('./logger')
        logger.error('Error in send', err)
    }
}