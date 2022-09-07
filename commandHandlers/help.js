const fs = require('fs')
const nws = require('../helpers/nws')
const errorEmbed = require('../helpers/errorEmbed')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')

module.exports = async (interaction, args) => {
  let helpFileName = '!'
  if (args.topic && args.topic.trim().length > 0) {
    helpFileName = args.topic.trim().toLowerCase()
  }
  helpFileName += '.md'

  fs.readFile(`./help/${helpFileName}`, 'utf8',
    async (err, data) => {
      if (err) {
        return await replyOrFollowUp(interaction, errorEmbed.get(nws`Couldn't find help \
          information for "${helpFileName}".`))
      }
      else {
        return await replyOrFollowUp(interaction, commonReplyEmbed.get('Documentation:', data))
      }
    })
}