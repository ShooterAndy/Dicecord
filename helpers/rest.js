/**
 * Shared Discord REST client singleton.
 * All modules should use this instead of creating their own REST instances.
 */
const { REST, RESTEvents } = require('@discordjs/rest')

let _rest = null

module.exports = () => {
  if (!_rest) {
    _rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN)
    // Console only (shows up in `heroku logs`): posting to the log channel goes through this
    // same client, so logging there could feed back into the rate limit being reported.
    _rest.on(RESTEvents.RateLimited, info => {
      console.warn(`[REST] Rate limited: ${info.method} ${info.route} ` +
        `(scope=${info.scope}, global=${info.global}, limit=${info.limit}, ` +
        `retryAfter=${info.retryAfter}ms, timeToReset=${info.timeToReset}ms)`)
    })
  }
  return _rest
}

