const replyOrSend = require('../helpers/replyOrSend')

module.exports = args => {
  return replyOrSend('No current notices',
    args.message)
}