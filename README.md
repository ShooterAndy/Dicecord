# Dicecord

Dicecord is a bot for the [Discord](https://discordapp.com/) instant messenger that is made to help dealing with various
things that require randomization, such as dice rolls, card draws, etc.  

## Getting Started

Getting this bot on your Discord server is very easy: all you need to do in a normal situation is open 
[this link](https://discordapp.com/api/oauth2/authorize?client_id=572698679618568193&scope=bot&permissions=0) and allow
the bot to join a server you'll select in the page that you'll see there.

### Prerequisites

Just remember that to do this, you need to have permission to invite users to the server you've selected, and for the
bot to function properly, it would need to have permissions to read and write the messages in the channel you want it to
 reply at.
 
If you'e not the administrator of the server you want Dicecord to join, you should ask the administrator to either 
invite it themselves, or to give you (and the bot) the required permissions.

## Commands

All the commands this bot responds to should be prefixed with the ```!``` symbol. The currently available commands are:

* ```!help``` &mdash; provides information about this bot. Add a command name to learn more about it, like 
```!help roll```.
* [!roll (!r)](help/roll.md) &mdash; rolls dice, supports multiple types of dice rolls, multiple rolls, etc.
* [!order (!o)](help/order.md) — randomly re-orders a comma-separated list.
* [!pick (!p)](help/pick.md) &mdash; picks a random item from a comma-separated list.
* [!shuffle (!s)](help/shuffle.md) &mdash; shuffles a standard deck of 54 cards.
* [!draw (!d)](help/draw.md) &mdash; draws the requested amount of cards from the deck.
* [!bbcode](help/bbcode.md) &mdash; returns the last message sent by this bot in BB-code (to be used for forums).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for information on versions.

## Built With

* [discord.js](https://discord.js.org) &mdash; Discord API;
* [discordbots API](https://discordbots.org/api/docs) &mdash; API for posting to discordbots.org; 
* [auto-changelog](https://github.com/CookPete/auto-changelog) &mdash; used to generate the changelog;
* [underscore.js](https://underscorejs.org/) &mdash; helps managing objects and arrays;
* [random](https://github.com/transitive-bullshit/random#readme) &mdash; helps with randomization.

## Versioning

[SemVer](http://semver.org/) versioning is used for this project. 

## Authors

* **Andrey Larionov** - *Initial work* - [ShooterAndy](https://github.com/ShooterAndy)

See also the list of [contributors](https://github.com/ShooterAndy/Dicecord/contributors) (if any) who participated in 
this project.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* This [very helpful article](https://www.freecodecamp.org/news/how-to-create-a-discord-bot-under-15-minutes-fb2fd0083844/)
* DiscordBotsList support server users