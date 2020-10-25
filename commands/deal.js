const draw = require('./draw')

module.exports = args => {
  args.verb = 'deal'
  return draw(args)
}