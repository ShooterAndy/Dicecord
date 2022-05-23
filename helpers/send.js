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
            const response = await Client.client.shard.broadcastEval(sendToChannel,
                { context: { channelId, messageText: part, flags } })
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
        return messages
    } catch (err) {
        const logger = require('./logger')
        logger.error('Error in send', err)
    }
}