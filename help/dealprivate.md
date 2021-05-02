**dealPrivate** (`depr`) allows you to deal a number of cards (1 by default) from the top of a deck. It will then DM these cards to the users mentioned in the command.

Note that each mentioned user receives their own cards, which means that if you deal 2 cards to 3 users, 6 cards in total would be removed from the deck.

Also note that you cannot just type the users' nicknames, you **have** to mention them (so that the text is properly highlighted in Discord).

You do not have to separate the mentions by commas.

See `!help shuffle` for more info about the deck itself.
See `!help deal` for a command that will show the dealt cards in the channel instead.

Example:
* `!dealPrivate 3 @user1 @user2 Some comment` — will DM three cards to user1 and user2, six in total, removing them from the channel deck, and preface them with your comment;
* `!depr @user1` — will DM 1 card to user1.