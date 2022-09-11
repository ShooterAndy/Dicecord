const handler = require('../commandHandlers/draw')
const privateHandler = require('./dealprivate')

module.exports = async (interaction, args) => {
  const { numberOfCardsToDraw, comment, usersList } = args
  if (usersList) {
    return await privateHandler(interaction, { numberOfCardsToDraw, comment, usersList })
  } else {
    return await handler(interaction, { numberOfCardsToDraw, comment, isPrivate: false })
  }
}