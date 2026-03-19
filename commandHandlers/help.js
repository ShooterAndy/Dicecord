const fs = require('fs')
const nws = require('../helpers/nws')
const errorEmbed = require('../helpers/errorEmbed')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')
const modifierDescriptions = require('../helpers/modifierDescriptions')

const MODIFIER_TOPIC_PREFIX = 'roll modifier: '
const ALL_MODIFIERS_TOPIC = 'roll modifiers'

module.exports = async (interaction, args) => {
  const topic = (args.topic || '').trim().toLowerCase()

  // Handle "roll modifiers" — list all modifiers
  if (topic === ALL_MODIFIERS_TOPIC) {
    const allMods = Object.keys(modifierDescriptions)
      .map(abbr => `\`${abbr}\` — ${modifierDescriptions[abbr].name}`)
      .join('\n')
    return await replyOrFollowUp(interaction, commonReplyEmbed.get(
      'Roll modifiers',
      `All available dice modifiers for the \`/roll\` command.\n` +
      `Use \`/help\` with a specific modifier (e.g. \`roll modifier: kh\`) for details.\n\n${allMods}`
    ))
  }

  // Handle "roll modifier: X" — show specific modifier details
  if (topic.startsWith(MODIFIER_TOPIC_PREFIX)) {
    const modAbbr = topic.slice(MODIFIER_TOPIC_PREFIX.length).trim()
    const desc = modifierDescriptions[modAbbr]
    if (!desc) {
      return await replyOrFollowUp(interaction, errorEmbed.get(
        `\`${modAbbr}\` is not a recognized roll modifier. ` +
        `Use \`/help topic:roll modifiers\` to see all available modifiers.`
      ))
    }
    const examples = Array.isArray(desc.example) ? desc.example : [desc.example]
    const exampleText = examples.map(ex => `Example: ${ex}`).join('\n')

    const text =
      `**\`${modAbbr}\`** — **${desc.name}**\n` +
      `Syntax: \`${desc.syntax}\`\n` +
      (desc.default ? `Default value: **${desc.default}**\n` : 'Value is required\n') +
      `\n${desc.description}\n` +
      `\n${exampleText}`
    return await replyOrFollowUp(interaction, commonReplyEmbed.get(
      `Roll modifier: ${modAbbr}`, text
    ))
  }

  // Default: read from help files
  let helpFileName = '!'
  let helpTitle = ''
  if (topic.length > 0) {
    helpFileName = topic
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

module.exports.MODIFIER_TOPIC_PREFIX = MODIFIER_TOPIC_PREFIX
module.exports.ALL_MODIFIERS_TOPIC = ALL_MODIFIERS_TOPIC

