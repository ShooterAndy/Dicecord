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
const send = require('./send')
const truncate = require('./truncate')

let _fallbackRest = null
const _getFallbackRest = () => {
  if (!_fallbackRest) {
    _fallbackRest = require('./rest')()
  }
  return _fallbackRest
}

const _trySendDirect = async (text) => {
  const Client = require('./client')
  const rest = (Client.client && Client.client.rest) || _getFallbackRest()
  try {
    const { Routes } = require('discord-api-types/v10')
    const { MessageFlags } = require('discord-api-types/v10')
    await rest.post(Routes.channelMessages(LOG_CHANNEL_ID), {
      body: { content: truncate(text), flags: MessageFlags.SuppressEmbeds }
    })
    return true
  } catch {
    return false
  }
}

module.exports = {
  async sendMessage (type, text, additionalInfo) {
    // Filtering out common expected errors to prevent log spam
    if (additionalInfo && additionalInfo.name &&
      (additionalInfo.name === 'DiscordAPIError' ||
        additionalInfo.name.startsWith('DiscordAPIError['))) {
      if (additionalInfo.message === 'Missing Access'
        || additionalInfo.message === 'Missing Permissions'
        || additionalInfo.message === 'Unknown Message'
        || additionalInfo.message === 'Invalid Webhook Token'
        || additionalInfo.code === 50027
        || additionalInfo.status === 503
        || additionalInfo.status === 502)
      return
    }

    const Client = require('./client')
    if (!text) {
      return this.sendMessage(LOG_TYPES.error, nws`Tried to log something but forgot to include \
        the text`)
    }
    if (!type || Object.values(LOG_TYPES).indexOf(type) === -1) {
      return this.sendMessage(LOG_TYPES.error, nws`Forgot to include the log type for this \
        log message`, text)
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
      try {
        let messageText = `${type}: ${text}`
        if (type === LOG_TYPES.info) {
          const format = THROW_RESULTS_FORMATS[DEFAULT_THROW_RESULT_FORMAT_NAME]
          messageText = `${format.boldStart}${type}:${format.boldEnd} ${text}`
        }
        if (type === LOG_TYPES.error) {
          messageText = `<@${ADMINISTRATOR_ID}>\`\`\`diff\n- ${messageText}\`\`\``
        }
        if (type === LOG_TYPES.warning) {
          messageText = `\`\`\`fix\n ${messageText}\`\`\``
        }
        if (additionalInfo) {
          if (typeof additionalInfo === 'object' && Object.keys(additionalInfo).length) {
            additionalInfo = JSON.stringify(additionalInfo)
          }
          messageText += `\`\`\`${additionalInfo}\`\`\``
        }

        messageText = truncate(messageText)

        if (await _trySendDirect(messageText)) return
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
      if (typeof additionalInfo === 'object' && Object.keys(additionalInfo).length) {
        additionalInfo = JSON.stringify(additionalInfo)
      }
      message += `\n${additionalInfo}`
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