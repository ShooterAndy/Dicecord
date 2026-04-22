/**
 * Pending interaction store for modal submissions and button clicks.
 *
 * When a handler calls `awaitModalSubmit()` or sets up an InteractionCollector,
 * it registers a pending entry here. When the corresponding HTTP request arrives,
 * the server checks this map and resolves the pending promise.
 */

const logger = require('./logger')

// customId → { resolve, reject, filter?, timer, type }
const _pending = new Map()

module.exports = {
  /**
   * Register a pending handler that will be resolved when a matching
   * interaction arrives.
   * @param {string} customId - The customId to listen for
   * @param {object} opts
   * @param {number} opts.time - Timeout in ms
   * @param {Function} [opts.filter] - Optional filter function
   * @param {string} [opts.type] - 'modal' or 'button'
   * @returns {Promise} Resolves with the interaction adapter, or null on timeout
   */
  wait (customId, { time, filter, type = 'modal' } = {}) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        _pending.delete(customId)
        resolve(null)
      }, time || 600_000) // default 10 minutes

      _pending.set(customId, { resolve, filter, timer, type })
    })
  },

  /**
   * Try to resolve a pending handler for the given customId.
   * @param {string} customId
   * @param {object} adapter - The interaction adapter for the incoming request
   * @returns {boolean} true if a pending handler was found and resolved
   */
  tryResolve (customId, adapter) {
    const entry = _pending.get(customId)
    if (!entry) return false

    // Apply filter if present
    if (entry.filter && !entry.filter(adapter)) return false

    clearTimeout(entry.timer)
    _pending.delete(customId)
    entry.resolve(adapter)
    return true
  },

  /**
   * Register a button collector (similar to InteractionCollector).
   * Unlike modals, button collectors can fire multiple times.
   * @param {string} messageId - The message ID to listen on
   * @param {object} opts
   * @param {Function} opts.onCollect - Called for each matching button click
   * @param {Function} [opts.onEnd] - Called when collector ends
   * @param {Function} [opts.filter] - Filter function
   * @param {number} opts.time - Timeout in ms
   * @returns {{ stop: Function }} A handle to stop the collector early
   */
  collectButtons (messageId, { onCollect, onEnd, filter, time }) {
    const key = `btn:${messageId}`
    const id = `${key}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
    const timer = setTimeout(() => {
      _pending.delete(id)
      if (onEnd) onEnd()
    }, time || 600_000)

    _pending.set(id, { messageId, onCollect, onEnd, filter, timer, type: 'button-collector' })

    return {
      stop: () => {
        clearTimeout(timer)
        _pending.delete(id)
        if (onEnd) onEnd()
      }
    }
  },

  /**
   * Try to dispatch a button click to a collector.
   * @param {string} messageId
   * @param {object} adapter - The interaction adapter
   * @returns {boolean} true if handled
   */
  tryDispatchButton (messageId, adapter) {
    for (const [key, entry] of _pending.entries()) {
      if (entry.type !== 'button-collector') continue
      if (entry.messageId !== messageId) continue
      if (entry.filter && !entry.filter(adapter)) continue
      entry.onCollect(adapter)
      return true
    }
    return false
  },

  /** Check if a pending entry exists */
  has (customId) {
    return _pending.has(customId)
  },

  /** Current size (for debugging) */
  get size () {
    return _pending.size
  },

  /** Expose entries iterator for modal matching in server.js */
  _getEntries () {
    return _pending.entries()
  },

  /** Delete a pending entry by key */
  _delete (key) {
    _pending.delete(key)
  }
}


