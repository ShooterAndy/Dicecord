**drawShuffled** allows you to draw a number of cards (1 by default) from a freshly shuffled deck of your choosing (`poker` by default).
The deck that was created by the `/shuffle` command is not affected by the use of this command.

See `/help topic:listdecktypes` to learn more about deck types and how to list them.

Examples:
* `/drawShuffled amount:3 comment:Some comment` — will show you three random cards (from the standard 54-cards `poker` deck) and preface them with your comment.
* `/drawShuffled amount:3 deck:rider-waite comment:Some comment` — will show you three random cards from the Rider-Waite Tarot deck and preface them with your comment.
* `/drawShuffled` — will show you one random card from the standard 54-cards `poker` deck.