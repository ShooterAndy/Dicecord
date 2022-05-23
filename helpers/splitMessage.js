const { MAX_MESSAGE_LENGTH } = require('./constants')

module.exports = text => {
    if (!text) {
        return ['']
    }
    const parts = []
    let remainingText = text
    while (remainingText.length > MAX_MESSAGE_LENGTH) {
        parts.push(remainingText.slice(0, MAX_MESSAGE_LENGTH))
        remainingText = remainingText.slice(MAX_MESSAGE_LENGTH)
    }
    parts.push(remainingText)
    return parts
}