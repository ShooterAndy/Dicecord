const formatMessage = require('../helpers/formatMessage')

module.exports = args => {
  args.formatting = 'markdown'
  formatMessage(args)
}

