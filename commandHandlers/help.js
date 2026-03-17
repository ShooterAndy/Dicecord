const fs = require('fs')
const nws = require('../helpers/nws')
const errorEmbed = require('../helpers/errorEmbed')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')

module.exports = async (interaction, args) => {
  let helpFileName = '!'
  let helpTitle = ''
  if (args.topic && args.topic.trim().length > 0) {
    helpFileName = args.topic.trim().toLowerCase()
    helpTitle = ` on the topic of ${args.topic.trim()}`
  }
  helpFileName += '.md'

  try {
    const data = await fs.promises.readFile(`./help/${helpFileName}`, 'utf8')
    return await replyOrFollowUp(interaction, commonReplyEmbed.get(
      `Documentation${helpTitle}:`, data))
  } catch (err) {
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`Couldn't find help \
      information${helpTitle}.`))
  }
}