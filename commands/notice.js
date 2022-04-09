const reply = require('../helpers/reply')

module.exports = args => {
  return reply('**IMPORTANT NOTICE:** due to Heroku, the service that provides hosting for ' +
    'this bot, suspending any services for Russian users from April 12th, this bot may go offline' +
    ' after that date.\n\nI will try to maintain it to the best of my abilities and start it ' +
    'after I relocate.\n\nApologies for the inconvenience,\nShooter__Andy',
    args.message)
}