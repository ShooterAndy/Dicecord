**markdown** (`md`) selects the last message sent by this bot on this channel and tries to convert it to markdown formatting.

Example:
`!markdown`

As an optional parameter, you can supply message id for the message you want to process.
Message id can be accessed via right-clicking the message from the bot and selecting the "Copy ID" option.
Note that you should have the developer mode enabled in your Discord client for that option to be available.
Also note that the bot won't try to search older messages beyond a certain limit.

Example:
`!markdown 123456789012345678`