const reply = require('../helpers/reply')

module.exports = args => {
  return reply('No current notices',
    args.message)
}