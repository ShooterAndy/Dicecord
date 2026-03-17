const logger = require('./logger')

const MAX_RETRIES = 2
const RETRY_BASE_DELAY_MS = 1000

const _isRetryable = (error) => {
  const code = error?.httpStatus ?? error?.status ?? error?.code
  return code >= 500 && code < 600
}

/**
 * Wraps a Discord API call with retry logic for transient 5xx errors.
 * @param {Function} fn        – A function that returns a Promise (the Discord API call).
 * @param {string}   [label]   – Optional label for logging on final failure.
 * @param {number}   [retries] – Number of retries (default: MAX_RETRIES).
 * @returns {Promise<*>}       – The result of the Discord API call, or null on final failure.
 */
const retryableDiscordRequest = async (fn, label, retries = MAX_RETRIES) => {
  try {
    return await fn()
  } catch (e) {
    if (retries > 0 && _isRetryable(e)) {
      const delay = RETRY_BASE_DELAY_MS * (MAX_RETRIES - retries + 1)
      await new Promise(resolve => setTimeout(resolve, delay))
      return retryableDiscordRequest(fn, label, retries - 1)
    }
    if (label) {
      logger.error(label, e)
    }
    throw e
  }
}

module.exports = retryableDiscordRequest

