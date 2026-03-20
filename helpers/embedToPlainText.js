const truncate = require('./truncate')

/**
 * Converts a Discord embed-based content object into a plain-text content object.
 * Preserves components (buttons, etc.) if present.
 *
 * @param {object} content – The original content object, e.g. { embeds: [EmbedBuilder], components: [...] }
 * @returns {object} A new content object with `content` (string) instead of `embeds`.
 */
module.exports = (content) => {
  if (!content || !content.embeds || !content.embeds.length) return content

  const embed = content.embeds[0]
  // EmbedBuilder stores data in .data; raw API objects have fields at top level
  const data = embed.data || embed

  let text = ''

  if (data.author && data.author.name) {
    text += `**${data.author.name}**\n`
  }

  if (data.description) {
    text += data.description
  }

  if (data.footer && data.footer.text) {
    text += `\n\n_${data.footer.text}_`
  }

  text = truncate(text, truncate.MAX_MESSAGE_LENGTH, truncate.EMBED_TRUNCATION_SUFFIX)

  const result = { ...content, content: text }
  delete result.embeds
  return result
}

