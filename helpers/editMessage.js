const { Routes } = require('discord-api-types/v10')

/**
 * Edits a Discord message via the REST API, bypassing the channel cache.
 * Use this instead of Message.edit() when ChannelManager cache is disabled.
 * @param {import('discord.js').Client} client – The discord.js Client instance.
 * @param {string} channelId – The channel the message is in.
 * @param {string} messageId – The message to edit.
 * @param {object} body      – The edit payload (e.g. { components: [] }).
 * @returns {Promise<object>} The raw API response.
 */
module.exports = (client, channelId, messageId, body) => {
  return client.rest.patch(Routes.channelMessage(channelId, messageId), { body })
}

