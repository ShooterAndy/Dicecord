**draw** allows you to draw a number of cards (1 by default) from the top of a deck that was previously shuffled for this channel. The result will be displayed on the channel.
See `/help topic:shuffle` for more info about the deck itself.
See `/help topic:drawshuffled` for a command that does neither require nor affect a pre-shuffled deck.

Examples:
`/draw amount:3 comment:Some comment` — will draw three cards, removing them from the channel deck, and preface them with your comment.
`/draw` — will draw one card, removing it from the channel deck.
`/draw amount:5 is_private:True` — will draw 5 cards, but will send them to your Direct Messages instead.