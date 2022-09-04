**shuffle** shuffles a deck of cards of your choosing (`poker` by default). Each Discord channel has its own deck.
You need to shuffle a deck on the server at least once before drawing any cards from it.

See `/help topic:listDeckTypes` to learn more about deck types and how to list them.

Additionally, you can shuffle a custom deck by listing your cards, separated by commas:\
`/shuffle deck:custom custom_cards:card 1, card 2, card 3, card 4`

Please note that a shuffled deck will expire after 30 days of not being drawn from, and it will be
deleted.

Examples:
* `/shuffle` — will shuffle and save a standard 54-card (52 normal + 2 jokers) `poker` deck for this channel.
* `/shuffle deck:nouveau` — will shuffle and save a Tarot Nouveau deck for this channel.