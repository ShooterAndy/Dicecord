const { MAX_MESSAGE_LENGTH, MAX_EMBED_DESCRIPTION_LENGTH } = require('./constants')

const DEFAULT_SUFFIX = '…'

/**
 * Truncates a string to a given maximum length, appending a suffix if truncated.
 * @param {string} text      – The text to truncate.
 * @param {number} maxLength – Maximum allowed length (default: MAX_MESSAGE_LENGTH).
 * @param {string} suffix    – Appended when the text is truncated (default: '…').
 * @returns {string}
 */
const truncate = (text, maxLength = MAX_MESSAGE_LENGTH, suffix = DEFAULT_SUFFIX) => {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength - suffix.length) + suffix
}

truncate.MAX_MESSAGE_LENGTH = MAX_MESSAGE_LENGTH
truncate.MAX_EMBED_DESCRIPTION_LENGTH = MAX_EMBED_DESCRIPTION_LENGTH
truncate.EMBED_TRUNCATION_SUFFIX = '\n\n… _(message truncated due to Discord character limit)_'

module.exports = truncate

