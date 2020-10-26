const {
  ADMINISTRATOR_ID,
  LOG_TYPES,
  LOG_CHANNEL_ID,
  LOG_PREFIX,
  THROW_RESULTS_FORMATS,
  DEFAULT_THROW_RESULT_FORMAT_NAME,
  IS_LOCAL
} = require('./constants')
const nws = require('./nws')

module.exports = {
  async sendMessage (type, text, additionalInfo) {
    const Client = require('./client')
    if (!text) {
      return this.sendMessage(LOG_TYPES.error, nws`Tried to log something but forgot to include \
        the text`)
    }
    if (!type || Object.values(LOG_TYPES).indexOf(type) === -1) {
      return this.sendMessage(LOG_TYPES.error, nws`Forgot to include the log type for this \
        log message`, text)
    }
    if (!Client.client || !Client.client.channels
      || !Client.client.channels.cache || !Client.client.channels.cache.size) {
      return this.sendConsoleMessage(type, text, additionalInfo)
    }
    if (IS_LOCAL) {
      this.sendConsoleMessage(type, text, additionalInfo)
    }
    if (!LOG_CHANNEL_ID) {
      return console.error(nws`${LOG_PREFIX}${LOG_TYPES.error}: Log channel id is not set`)
    }
    if (!ADMINISTRATOR_ID) {
      return console.error(nws`${LOG_PREFIX}${LOG_TYPES.error}: Administrator id is not set`)
    }
    try {
      const channel = await Client.client.channels.fetch(LOG_CHANNEL_ID)
      if (!channel) {
        return console.error(nws`${LOG_PREFIX}${LOG_TYPES.error}: Bot is not present on logs \
        channel "${LOG_CHANNEL_ID}"`)
      }
      try {
        let message = `${type}: ${text}`
        if (type === LOG_TYPES.info) {
          const format = THROW_RESULTS_FORMATS[DEFAULT_THROW_RESULT_FORMAT_NAME]
          message = `${format.boldStart}${type}:${format.boldEnd} ${text}`
        }
        if (type === LOG_TYPES.error) {
          message = `<@${ADMINISTRATOR_ID}>\`\`\`diff\n- ${message}\`\`\``
        }
        if (type === LOG_TYPES.warning) {
          message = `<@${ADMINISTRATOR_ID}>\`\`\`fix\n ${message}\`\`\``
        }
        if (additionalInfo) {
          message += `\n${message}`
        }

        return channel.send(message, { split: true })

      } catch (error) {
        return console.error(nws`${LOG_PREFIX}${LOG_TYPES.error}: Failed to send a message to the \
          log channel:\n${error}\n\nOriginal log message:\n${text}`)
      }
    } catch (error) {
      return console.error(nws`${LOG_PREFIX}${LOG_TYPES.error}: Failed to fetch log channel:\n\
        ${error}`)
    }
  },
  sendConsoleMessage (type, text, additionalInfo) {
    if (!text) {
      return this.sendConsoleMessage(LOG_TYPES.error, nws`Tried to log something in console but \
        forgot to include the text`)
    }
    if (!type || Object.values(LOG_TYPES).indexOf(type) === -1) {
      return this.sendConsoleMessage(LOG_TYPES.error, nws`Forgot to include the log type for this \
        console log message:\n${text}`)
    }
    let message = `${LOG_PREFIX}${type}: ${text}`
    if (additionalInfo) {
      message += `\n${message}`
    }
    switch (type) {
      case LOG_TYPES.error: {
        console.error(message)
        break
      }
      case LOG_TYPES.warning: {
        console.warn(message)
        break
      }
      case LOG_TYPES.info: {
        console.log(message)
      }
    }
  },
  log (text, additionalInformation) {
    this.sendMessage(LOG_TYPES.info, text, additionalInformation)
  },
  error (text, additionalInformation) {
    this.sendMessage(LOG_TYPES.error, text, additionalInformation)
  },
  warn (text, additionalInformation) {
    this.sendMessage(LOG_TYPES.warning, text, additionalInformation)
  }
}