const { MAX_MESSAGE_LENGTH } = require('./constants')

module.exports = text => {
  if (!text) {
    return ['']
  }
  const parts = []
  let remainingText = text
  while (remainingText.length > MAX_MESSAGE_LENGTH) {
    let splitIndex = -1

    // Try to split at a newline boundary first
    const newlineIndex = remainingText.lastIndexOf('\n', MAX_MESSAGE_LENGTH)
    if (newlineIndex > 0) {
      splitIndex = newlineIndex + 1 // include the newline in the current part
    }

    // Fall back to splitting at a space
    if (splitIndex <= 0) {
      const spaceIndex = remainingText.lastIndexOf(' ', MAX_MESSAGE_LENGTH)
      if (spaceIndex > 0) {
        splitIndex = spaceIndex + 1
      }
    }

    // Last resort: hard cut
    if (splitIndex <= 0) {
      splitIndex = MAX_MESSAGE_LENGTH
    }

    parts.push(remainingText.slice(0, splitIndex))
    remainingText = remainingText.slice(splitIndex)
  }
  parts.push(remainingText)
  return parts
}