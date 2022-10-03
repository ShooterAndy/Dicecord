# Dicecord 
**Dicecord** is a bot for the [Discord](https://discord.com/) instant messenger that was made to 
help with various randomization-related tasks, such as dice rolls, card draws, etc.

**Dicecord** is completely free and has no paid unlockable features, but I do have to pay some 
amount of money to host it and its database, so if you like it and want to support its continued 
existence and development, you can tip me on Ko-fi:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H2H35Y7TO)

## Getting Started

Getting this bot on your Discord server is very easy: all you need to do in a normal situation is 
open **[this link](https://discord.com/api/oauth2/authorize?client_id=572698679618568193&permissions=1024&scope=bot)**
and allow the bot to join a server you'll select in the page that you'll see there.

### Prerequisites

Just remember that to do this, you would need to have the permission to invite users to the server 
you've selected. If you're not the owner or an administrator of the server you want **Dicecord** to 
join, you should ask the owner or an administrator to either invite it themselves, or to give you 
the required permissions.

## Commands

All the commands this bot will respond to should be prefixed with the ```/``` symbol.
The currently available commands are:

* ```/help``` &mdash; provides information about this bot. Add a topic, such as a name of a 
command, to learn more about it, like ```/help topic:roll```.
* [/roll](https://github.com/ShooterAndy/Dicecord/blob/master/detailedHelp/roll.md) — 
rolls dice, supports multiple types of dice rolls, multiple rolls, etc.
* [/order](https://github.com/ShooterAndy/Dicecord/blob/master/help/order.md) — 
randomly re-orders a comma-separated list.
* [/pick](https://github.com/ShooterAndy/Dicecord/blob/master/help/pick.md) — 
picks a random item from a comma-separated list.
* [/slots](https://github.com/ShooterAndy/Dicecord/blob/master/help/slots.md) —
pulls the lever on a customizable slot machine.
* **Card-related commands:**
  * [/listDeckTypes](https://github.com/ShooterAndy/Dicecord/blob/master/help/listdecktypes.md) — 
lists all existing deck types.
  * [/examineDeck](https://github.com/ShooterAndy/Dicecord/blob/master/help/examinedeck.md) —
shows a brief description of the requested type of deck (optionally can show the list of cards).
  * [/shuffle](https://github.com/ShooterAndy/Dicecord/blob/master/help/shuffle.md) — 
shuffles a deck of cards of a specific type (or a custom deck) and saves it.
  * [/draw](https://github.com/ShooterAndy/Dicecord/blob/master/help/draw.md) — 
draws the requested amount of cards from the saved deck.
  * [/deal](https://github.com/ShooterAndy/Dicecord/blob/master/help/deal.md) — 
deals the requested amount of cards from the saved deck (can deal into DMs).
  * [/drawShuffled](https://github.com/ShooterAndy/Dicecord/blob/master/help/drawshuffled.md) — 
draws the requested amount of cards from a fresh deck without saving it.
  * [/insert](https://github.com/ShooterAndy/Dicecord/blob/master/help/insert.md) — 
inserts specified card(s) into the saved deck at random positions.
* **Saving commands** 
(see [this page](https://github.com/ShooterAndy/Dicecord/blob/master/help/saving.md) for more 
details on how to save commands):
  * [/listSaved](https://github.com/ShooterAndy/Dicecord/blob/master/help/listsaved.md) —
lists the names of all the commands that were saved by you.
  * [/examineSaved](https://github.com/ShooterAndy/Dicecord/blob/master/help/examinesaved.md) — 
returns the specified saved command with its parameters.
  * [/executeSaved](https://github.com/ShooterAndy/Dicecord/blob/master/help/executesaved.md) — 
executes a saved command.
  * [/deleteSaved](https://github.com/ShooterAndy/Dicecord/blob/master/help/deletesaved.md) — 
deletes a saved roll command.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the information on specific version changes.

## Built With

* [discord.js](https://discord.js.org) &mdash; Discord API;
* [auto-changelog](https://github.com/CookPete/auto-changelog) &mdash; used to generate the changelog;
* [underscore.js](https://underscorejs.org/) &mdash; helps managing objects and arrays;
* [random](https://github.com/transitive-bullshit/random#readme) &mdash; helps with randomization;
* [Heroku PostGres](https://elements.heroku.com/addons/heroku-postgresql) &mdash; stores decks and prefixes;
* [pg-promise](https://github.com/vitaly-t/pg-promise) &mdash; allows for much simpler and more convenient code for PostGres queries;
* [discord-hybrid-sharding](https://www.npmjs.com/package/discord-hybrid-sharding) &mdash; combines clustering and sharding;
* [@top-gg/sdk](https://www.npmjs.com/package/@top-gg/sdk) &mdash; used to post bot stats to [top.gg](https://top.gg).

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