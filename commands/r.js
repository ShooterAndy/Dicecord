const roll = require('./rollV3')

module.exports = args => {
  return roll.processMessage(args)
}