const draw = require('./draw')

module.exports = args => {
  args.isPrivate = true
  return draw(args)
}