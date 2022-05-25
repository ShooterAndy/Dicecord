const fs = require('fs')
const v8 = require('v8')
const logger = require('../helpers/logger')

const createHeapSnapshot = () => {
  const snapshotStream = v8.getHeapSnapshot()
  // It's important that the filename end with `.heapsnapshot`,
  // otherwise Chrome DevTools won't open it.
  const fileName = `dicecord.heapsnapshot`
  const fileStream = fs.createWriteStream(fileName)
  snapshotStream.pipe(fileStream)
}

module.exports = async (args) => {
  if (!args || !args.message || !args.message.author) {
    logger.error('Something tried to access !getHeapDump')
    return
  }
  if (args.message.author.id !== process.env.ADMINISTRATOR_ID) {
    logger.error(`Someone tried to access !getHeapDump: ${JSON.stringify(args.message.author)}`)
    return
  }
  createHeapSnapshot()
  const { MessageAttachment } = require('discord.js');

  const file = new MessageAttachment('dicecord.heapsnapshot');
  args.message.channel.send('Heap dump ready', { files: [file] })
}