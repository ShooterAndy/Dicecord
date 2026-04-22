/**
 * Shared Discord REST client singleton.
 * All modules should use this instead of creating their own REST instances.
 */
const { REST } = require('@discordjs/rest')

let _rest = null

module.exports = () => {
  if (!_rest) {
    _rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN)
  }
  return _rest
}

