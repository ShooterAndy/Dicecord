**roll** command is very versatile and allows you to:
 * Roll a custom number of dice with a custom number of sides, for example `!roll 3d8` will roll three eight-sided dice;
 * Roll a fudge dice by using `!roll fudge`, or `!roll f`, or `!roll 4dF`;
 * Roll Roll'n'Keep dice, for example `!roll 4k2e9` will roll four ten-sided dice which will explode on 9 and 10, and sum up the 2 highest results.

All these commands are also modifiable with additional parameters:
 * You can add a bonus (or a penalty) to a dice roll, such as `!roll 1d20 + 5 - 3` will add 2 to the result of the roll;
 * You can repeat the roll several times and sum up all the results like so: `!roll 2d4+5 * 3`;
 * You can repeat the roll several times without summing up the results too: `!roll 1d20+8 aoe 3`;
 * You can set a minimum result for a die (aka "brutal roll"), like this: `!roll 1d10>2+5`;
 * You can add a check for success or failure, such as `!roll 1d20+8aoe2 vs 16,18`;
 * You can add a comment to the roll, like so: `!roll 4d6 + 6 ? Your comment goes here`;
 * Alternatively, if you want your comment to appear after the roll, you can use "?!" instead of "?".

Lastly, you can request several rolls in one message by separating them with a semicolon, like so:
`!roll 1d20+8 aoe 3 vs 14, 15, 20 ? Attack rolls; 2d4+5 ? Damage rolls`
Or you can make rolls rely on the success or failure of the previous roll, like so:
`!roll 1d20+8 vs 21 ? Attack roll => 1d8+4+1d6 ?! damage to enemy`