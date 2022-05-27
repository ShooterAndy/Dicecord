const replyOrSend = require('../helpers/replyOrSend')

module.exports = async args => {
  return await replyOrSend('No current notices',
    args.message)
}