const fs = require('fs')
const nws = require('../helpers/nws')
const errorEmbed = require('../helpers/errorEmbed')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')
const modifierDescriptions = require('../helpers/modifierDescriptions')
const diceDescriptions = require('../helpers/diceDescriptions')
const syntaxDescriptions = require('../helpers/syntaxDescriptions')

// Topic prefixes and listing topics for roll-related inline help
const ROLL_TOPICS = {
  modifiers: { prefix: 'roll modifier: ', listTopic: 'roll modifiers', label: 'Roll modifiers', descriptions: modifierDescriptions },
  dice:      { prefix: 'roll dice: ',     listTopic: 'roll dice types', label: 'Roll dice types', descriptions: diceDescriptions },
  syntax:    { prefix: 'roll syntax: ',   listTopic: 'roll syntax',     label: 'Roll syntax',     descriptions: syntaxDescriptions }
}

// Shared formatter for a single description entry
const formatDescription = (key, desc) => {
  const examples = Array.isArray(desc.example) ? desc.example : [desc.example]
  const exampleText = examples.map(ex => `Example: ${ex}`).join('\n')

  let text = `**\`${key}\`** — **${desc.name}**\n`
  text += `Syntax: ${desc.syntax}\n`
  if (desc.default !== undefined) {
    text += (desc.default ? `Default value: **${desc.default}**\n` : 'Value is required\n')
  }
  text += `\n${desc.description}\n`
  text += `\n${exampleText}`
  return text
}

const ROLL_ALL_TOPICS = 'roll topics'
const TOPICS_TOPIC = 'topics'
const GENERAL_TOPICS = ['commands', 'permissions', 'saving']

module.exports = async (interaction, args) => {
  const topic = (args.topic || '').trim().toLowerCase()

  // Handle "topics" — list all available help topics
  if (topic === TOPICS_TOPIC) {
    const helpPath = './help'
    const helpFiles = fs.readdirSync(helpPath).filter(file => file.endsWith('.md'))
    const allFileTopics = helpFiles
      .map(f => f.replace('.md', '').toLowerCase())
      .filter(f => f !== '!')

    const generalTopics = allFileTopics
      .filter(f => GENERAL_TOPICS.includes(f))
      .map(f => `\`${f}\``)
      .join(', ')
    const commandTopics = allFileTopics
      .filter(f => !GENERAL_TOPICS.includes(f))
      .map(f => `\`${f}\``)
      .join(', ')
    const rollCategories = Object.values(ROLL_TOPICS)
      .map(cat => `• \`/help topic:${cat.listTopic}\`  — ${cat.label}`)
      .join('\n')
    return await replyOrFollowUp(interaction, commonReplyEmbed.get(
      'All help topics',
      `**General:**\n${generalTopics}\n\n` +
      `**Commands:**\n${commandTopics}\n\n` +
      `**Roll-related** (\`/help topic:roll topics\`):\n${rollCategories}\n\n` +
      `Type a topic name into \`/help\` to see its details.`
    ))
  }

  // Handle "roll topics" — list all roll topic categories
  if (topic === ROLL_ALL_TOPICS) {
    const categoryList = Object.values(ROLL_TOPICS)
      .map(cat => `• \`/help topic:${cat.listTopic}\` — ${cat.label}`)
      .join('\n')
    return await replyOrFollowUp(interaction, commonReplyEmbed.get(
      'Roll help topics',
      `All available roll-related help categories:\n\n${categoryList}\n\n` +
      `You can also look up a specific entry directly, e.g. \`/help topic:roll modifier: kh\`.`
    ))
  }

  // Check each roll topic category for list topics and detail topics
  for (const category of Object.values(ROLL_TOPICS)) {
    // List topic (e.g. "roll modifiers", "roll dice types", "roll syntax")
    if (topic === category.listTopic) {
      const allEntries = Object.keys(category.descriptions)
        .map(key => `\`${key}\` — ${category.descriptions[key].name}`)
        .join('\n')
      return await replyOrFollowUp(interaction, commonReplyEmbed.get(
        category.label,
        `Use \`/help\` with a specific entry (e.g. \`${category.prefix}${Object.keys(category.descriptions)[0]}\`) for details.\n\n${allEntries}`
      ))
    }

    // Detail topic (e.g. "roll modifier: kh", "roll dice: fudge", "roll syntax: vs")
    if (topic.startsWith(category.prefix)) {
      const key = topic.slice(category.prefix.length).trim()
      const desc = category.descriptions[key]
      if (!desc) {
        return await replyOrFollowUp(interaction, errorEmbed.get(
          `\`${key}\` is not a recognized entry. ` +
          `Use \`/help topic:${category.listTopic}\` to see all available options.`
        ))
      }
      return await replyOrFollowUp(interaction, commonReplyEmbed.get(
        `${category.label}: ${key}`, formatDescription(key, desc)
      ))
    }
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

module.exports.ROLL_TOPICS = ROLL_TOPICS
module.exports.ROLL_ALL_TOPICS = ROLL_ALL_TOPICS
module.exports.TOPICS_TOPIC = TOPICS_TOPIC
module.exports.GENERAL_TOPICS = GENERAL_TOPICS
