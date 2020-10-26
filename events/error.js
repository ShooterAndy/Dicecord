const logger = require('../helpers/logger')
const {
  LOG_PREFIX,
  LOG_TYPES
} = require('../helpers/constants')

module.exports = (client, error) => {
  if (client && client.user) {
    logger.error(`Error event caught`, error)
  } else {
    console.error(`${LOG_PREFIX}${LOG_TYPES.error}: Error event caught:\n${error}`)
  }
}