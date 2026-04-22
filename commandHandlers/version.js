const fs = require('fs')
const path = require('path')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')
const logger = require('../helpers/logger')

const CHANGELOG_URL = 'https://github.com/ShooterAndy/Dicecord/blob/master/CHANGELOG.md'

/**
 * Parse the latest version entry from CHANGELOG.md.
 * Returns an array of human-readable change lines (without commit hashes/PR links).
 */
const getLatestChanges = () => {
  try {
    const changelog = fs.readFileSync(
      path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8'
    )
    // Find the first version heading and capture until the next one
    const match = changelog.match(
      /####\s+\[v[\d.]+\].*?\n([\s\S]*?)(?=####\s+\[v[\d.]+\]|$)/
    )
    if (!match || !match[1]) return []

    return match[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('- '))
      .map(line => {
        // Strip markdown links like [`text`](url) and [`commit`](url)
        return line
          .replace(/\s*\[`[a-f0-9]+`\]\([^)]+\)/g, '')  // commit links
          .replace(/\s*\[`#\d+`\]\([^)]+\)/g, '')         // PR links with backticks
          .replace(/\s*\[#\d+\]\([^)]+\)/g, '')            // PR links without backticks
          .trim()
      })
      .filter(line => line.length > 2) // filter out empty "- " lines
  } catch (err) {
    logger.error('Failed to parse CHANGELOG.md', err)
    return []
  }
}

module.exports = async (interaction) => {
  const version = require('../package.json').version

  let text = `**Version:** v${version}\n`
  text += `**Changelog:** [View full changelog](${CHANGELOG_URL})\n`

  const changes = getLatestChanges()
  if (changes.length > 0) {
    text += `\n**Recent changes:**\n`
    text += changes.map(c => `• ${c.replace(/^- /, '')}`).join('\n')
  }

  return await replyOrFollowUp(interaction,
    commonReplyEmbed.get('Dicecord Version', text))
}

