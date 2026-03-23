const {
  SAVED_CMD_SCOPE_PERSONAL,
  SAVED_CMD_SCOPE_GUILD
} = require('./constants')

/**
 * Parses a scope-prefixed saved-command name from autocomplete.
 * "p:fireball" → { scope: 'personal', name: 'fireball' }
 * "g:fireball" → { scope: 'guild', name: 'fireball' }
 * "fireball"   → { scope: null, name: 'fireball' }  (no prefix / manual input)
 */
module.exports = (raw) => {
  if (!raw) return { scope: null, name: null }
  if (raw.startsWith(SAVED_CMD_SCOPE_PERSONAL)) {
    return { scope: 'personal', name: raw.slice(SAVED_CMD_SCOPE_PERSONAL.length) }
  }
  if (raw.startsWith(SAVED_CMD_SCOPE_GUILD)) {
    return { scope: 'guild', name: raw.slice(SAVED_CMD_SCOPE_GUILD.length) }
  }
  return { scope: null, name: raw }
}

