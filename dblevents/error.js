const logger = require('../helpers/logger')

module.exports = error => {
  logger.error(`DBL Error`, error)
}