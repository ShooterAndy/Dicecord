# Dicecord

Dicecord is a bot for the [Discord](https://discordapp.com/) instant messenger that is made to help dealing with various things that require randomization, such as dice rolls, card draws, etc.  

## Getting Started

Getting this bot on your Discord server is very easy: all you need to do in a normal situation is open [this link](https://discord.com/api/oauth2/authorize?client_id=572698679618568193&permissions=19520&scope=bot) and allow the bot to join a server you'll select in the page that you'll see there.

### Prerequisites

Just remember that to do this, you would need to have the permission to invite users to the server you've selected, and 
for the bot to function properly, it would need to have the permission to read and write messages in the channel you 
want it to be at.
 
If you're not the owner or an administrator of the server you want Dicecord to join, you should ask the owner or an 
administrator to either invite it themselves, or to give you (and the bot) the required permissions.

## Commands

All the commands this bot will respond to should be prefixed with the ```!``` symbol (can be changed).
The currently available commands are:

* ```!help``` &mdash; provides information about this bot. Add a command name to learn more about it, like ```!help roll```.
* [!roll (!r)](https://github.com/ShooterAndy/Dicecord/blob/master/detailedHelp/roll.md) &mdash; rolls dice, supports multiple types of dice rolls, multiple rolls, etc.
* [!order (!o)](https://github.com/ShooterAndy/Dicecord/blob/master/help/order.md) — randomly re-orders a comma-separated list.
* [!pick (!p)](https://github.com/ShooterAndy/Dicecord/blob/master/help/pick.md) &mdash; picks a random item from a comma-separated list.
* [!listDeckTypes (!ldt)](https://github.com/ShooterAndy/Dicecord/blob/master/help/listdecktypes.md) &mdash; lists all existing deck types.
* [!examineDeck (!ed)](https://github.com/ShooterAndy/Dicecord/blob/master/help/examinedeck.md) &mdash; shows a brief description of the requested type of deck (optionally can show the list of cards).
* [!shuffle (!s)](https://github.com/ShooterAndy/Dicecord/blob/master/help/shuffle.md) &mdash;  shuffles a deck of cards of a specific type and saves it.
* [!draw (!d)](https://github.com/ShooterAndy/Dicecord/blob/master/help/draw.md) &mdash; draws the requested amount of cards from the saved deck.
* [!deal](https://github.com/ShooterAndy/Dicecord/blob/master/help/deal.md) &mdash; deals the requested amount of cards from the saved deck.
* [!drawShuffled (!drsh)](https://github.com/ShooterAndy/Dicecord/blob/master/help/drawshuffled.md) &mdash; draws the requested amount of cards from a fresh deck.
* [!drawPrivate (!drpr)](https://github.com/ShooterAndy/Dicecord/blob/master/help/drawprivate.md) &mdash; draws the requested amount of cards from the saved deck and DMs them to you.
* [!bbcode](https://github.com/ShooterAndy/Dicecord/blob/master/help/bbcode.md) &mdash; returns the last message sent by this bot in BB-code (to be used for forums).
* [!markdown (!md)](https://github.com/ShooterAndy/Dicecord/blob/master/help/markdown.md) &mdash; returns the last message sent by this bot in markdown code.
* [!saveRoll (!sr)](https://github.com/ShooterAndy/Dicecord/blob/master/help/saveroll.md) &mdash; saves a roll command for later use.
* [!getSaved (!gs)](https://github.com/ShooterAndy/Dicecord/blob/master/help/getsaved.md) &mdash; returns the text of a saved roll command.
* [!rollSaved (!rs)](https://github.com/ShooterAndy/Dicecord/blob/master/help/rollsaved.md) &mdash; rolls a saved roll command.
* [!deleteSaved (!ds)](https://github.com/ShooterAndy/Dicecord/blob/master/help/deletesaved.md) &mdash; deletes a saved roll command.
* [!setPrefix](https://github.com/ShooterAndy/Dicecord/blob/master/help/setprefix.md) &mdash; sets the command prefix (```!``` by default) this bot will use in this Guild, _administrator-only!_ 

## Settings

See the [settings page](https://github.com/ShooterAndy/Dicecord/blob/master/help/settings.md) for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the information on specific version changes.

## Built With

* [discord.js](https://discord.js.org) &mdash; Discord API;
* [discordbots API](https://discordbots.org/api/docs) &mdash; API for posting to discordbots.org; 
* [auto-changelog](https://github.com/CookPete/auto-changelog) &mdash; used to generate the changelog;
* [underscore.js](https://underscorejs.org/) &mdash; helps managing objects and arrays;
* [random](https://github.com/transitive-bullshit/random#readme) &mdash; helps with randomization;
* [Heroku PostGres](https://elements.heroku.com/addons/heroku-postgresql) &mdash; stores decks and prefixes.
* [pg-promise](https://github.com/vitaly-t/pg-promise) &mdash; allows for much simpler and more convenient code for PostGres quieries.

## Versioning

[SemVer](http://semver.org/) versioning is used for this project. 

## Authors

* **Andrey Larionov** - *Initial work* - [ShooterAndy](https://github.com/ShooterAndy)

## Contributors

* **Harry Pollard** - *Bug-fixing* — [meharryp](https://github.com/meharryp)

The full, up-to-date list of [contributors](https://github.com/ShooterAndy/Dicecord/contributors).

## License

This project is licensed under the MIT License - see the [LICENSE.md](https://github.com/ShooterAndy/Dicecord/blob/master/LICENSE.md) file for details

## Acknowledgments

* This [very helpful article](https://www.freecodecamp.org/news/how-to-create-a-discord-bot-under-15-minutes-fb2fd0083844/)
* DiscordBotsList support server users
* [Heroku](https://heroku.com) for hosting this bot