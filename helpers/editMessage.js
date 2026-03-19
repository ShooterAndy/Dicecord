const { Routes } = require('discord-api-types/v10')

// Errors that mean the message/channel is gone — nothing left to edit
const IGNORABLE_CODES = [
  10003, // Unknown Channel (channel deleted or bot kicked)
  10008, // Unknown Message (message deleted)
  50083  // Thread is archived (can't edit messages in archived threads)
]

/**
 * Edits a Discord message via the REST API, bypassing the channel cache.
 * Use this instead of Message.edit() when ChannelManager cache is disabled.
 * Silently resolves if the channel or message no longer exists.
 * @param {import('discord.js').Client} client – The discord.js Client instance.
 * @param {string} channelId – The channel the message is in.
 * @param {string} messageId – The message to edit.
 * @param {object} body      – The edit payload (e.g. { components: [] }).
 * @returns {Promise<object|null>} The raw API response, or null if the target is gone.
 */
module.exports = async (client, channelId, messageId, body) => {
  try {
    return await client.rest.patch(Routes.channelMessage(channelId, messageId), { body })
  } catch (error) {
    if (IGNORABLE_CODES.includes(error?.code)) return null
    throw error
  }
}


