const formatMessage = require('../helpers/formatMessage')

module.exports = args => {
  args.formatting = 'bbcode'
  formatMessage(args)
}

