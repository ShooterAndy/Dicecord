const fs = require('fs')
const replyOrSend = require('../helpers/replyOrSend')
const nws = require('../helpers/nws')
const {
  ERROR_PREFIX
} = require('../helpers/constants')

module.exports = args => {
  let helpFileName = '!'
  if(args.commandText.trim().length > 0) {
    helpFileName = args.commandText.trim().toLowerCase()
  }
  helpFileName += '.md'

  fs.readFile(`./help/${helpFileName}`, 'utf8',
    (err, data) => {
    if (err) {
      return replyOrSend(nws`${ERROR_PREFIX}Couldn't find help information for "${helpFileName}".`,
        args.message)
    }
    else {
      return replyOrSend(data, args.message, true)
    }
  })
}