**order** (`o`) allows you to randomly order a list of comma-separated values.

Example:
`!order Alice, Bob, Candy, Denis, ...` — will shuffle the list and return the resulting list to you.

Accepts two keys: `-ul` and `-ol`, for unordered and ordered lists respectively.
Adding either of them before your comma-separated list will produce a list separated by linebreaks instead of commas.

Example:
`!order -ul Alice, Bob, Candy, Denis, ...` — will return the list with an asterisk and a linebreak before each item.
`!order -ol Alice, Bob, Candy, Denis, ...` — will return the list with a number and a linebreak before each item.