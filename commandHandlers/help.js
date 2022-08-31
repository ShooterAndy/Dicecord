const fs = require('fs')
const nws = require('../helpers/nws')
const errorEmbed = require('../helpers/errorEmbed')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')

module.exports = async (interaction, args) => {
  let helpFileName = '!'
  if (args.commandText && args.commandText.trim().length > 0) {
    helpFileName = args.commandText.trim().toLowerCase()
  }
  helpFileName += '.md'

  fs.readFile(`./help/${helpFileName}`, 'utf8',
    async (err, data) => {
      if (err) {
        return await interaction.reply(errorEmbed.get(nws`Couldn't find help information for \
        "${helpFileName}".`))
      }
      else {
        return await interaction.reply(commonReplyEmbed.get('Documentation:', data))
      }
    })
}