# Roll command
## Basics
The **roll** command, abbreviated as `r`, is an extremely versatile way to roll dice. It allows you
to roll several kinds of dice at the same time, apply bonuses and penalties, have repeated and
conditional rolls, etc. Please read through this document thoroughly to understand the full
range of possibilities that it offers.

## Parts of the roll command
Before we establish how to roll dice, let's quickly define some terms we will be using later. Each 
time you enter a roll command, it can have several "levels". Let's go over them from highest to 
lowest:
* **Whole command** — everything that you write after `!roll`.
  * **Command part** — the command can have multiple parts, each either completely independent of
each other, or dependent on the previous part's result (see "Multiple command parts" and  
"Conditional command parts" sections below for more details). The part with all the operands and 
operators is called a "formula" (see the section below for more details).
    * **Dice throw** — aside from static numbers and operators, each command part can have multiple 
dice throws (see the "Rolling dice" section below).
      * **Die throw** — each dice throw can consist of several individual dice, each of which has 
      its own _die throw results_.
      
## Formula
### Basics of operands and operators
Each throw you request has a formula to it. It can be as simple as a single number, or very complex.
The parts of the formula (aka operands) are separated from each other by the `+` or `-` operators,
such as here:

```!r 2 + 2```

Or here:

```!r 1 + 2 - 3```

### Using parentheses
You can use parentheses in your formula, just as they are used in arithmetic normally, so, for
example, this command:

```!r 3 - (1+2)```

Would be equivalent to this one:

```!r 3 - 1 - 2```

The maximum level of depth for parentheses is 5.

## Rolling dice
### Basics of rolling dice
The **roll** command allows you to roll (almost) any number of dice with (almost) any number of 
sides. The actual lower limit is 1 for both number and sides, and the upper limits are 100 for the
number of rolled dice and 10,000 for the number of die sides.

The basic syntax for this is as follows:

```[NUMBER]d[SIDES]```

There, the `[NUMBER]` is the number of die rolls and `[SIDES]` is the number of die sides for each
roll. Of course, `d` stands for **d**ice.

To roll one standard six-sided die, you know, 🎲, you would then need to type: `!r 1d6`

Or just `!r d6`, since if the number of die rolls is not specified, it is assumed to be 1.

After sending a message with this command, you should get something like this from the bot in reply:
> 1d6 = **2**

Rolling 4 ten-sided dice would look like this: `!r 4d10` and produce something like this:
> 4d10 = [2 + 7 + 3 + 3] = **15**

As you can see, the results are grouped between the `[` and `]` symbols.

### Static bonuses and penalties
You can apply static bonuses and penalties to a die throw by using the `+` and `-` operands. This 
command, for example, will roll one twenty-sided die and add 5 to the result of that roll:

```!r 1d20+5```

On the other hand, this command will roll three six-sided dice and subtract 4 from the result:

```!r 3d6 - 4```

You can combine dice, bonuses and penalties in any way you want (see the "Formula" part above):

```!r 5 + 2d10 - (4 - 1d6) ```

### Dice modifiers
You can apply various modifiers to a die roll. Each dice modifier consists of a short abbreviation 
and a numerical parameter, such as `e5`. These are the currently available dice modifiers: 

* `e` — **explode** — makes any single die "explode" if its result is equal to or over the value
of the parameter, meaning that this die will be rolled again, and the result of that roll will be
added to the previous one. The new roll can also result in an explosion, and so forth, until the
maximum number of explosions is reached (10 by default). Note that in a roll of multiple dice, 
such as `4d6e6`, the explosion will occur if _any_ of the four six-sided dice will roll a 6,
not if _all_ four do, and it will only add one more roll of a six-sided die, not four of them.
* `t` — (explode) **times** — meaningless on its own, but, combined with the `e` dice modifier, 
will set the maximum number of times a single die roll can "explode" in a row. For example, 
`4d6e6t1` will mean that even if the first explosion die will again roll a 6, it will not explode
the second time.  
* `co` — **count over** — counts how many rolls in a dice throw will have a result that is over the
value of the parameter. For example, if the dice in a throw of `4d6co3` have the results 
[1, 3, 4, 6], the final result of this throw will equal **2** (one for the die roll result of 4 and 
one for the die roll result of 6; the second die roll result does not count, since only the results
strictly over 3 are counted).  
* `cu` — **count under** — see above, except this dice modifier counts how many die roll results are
 _under_ the value of the parameter. For the die roll results above, a throw of `4d6cu3` will have
 **1** as its result (since only the first die rolled a value strictly below 3). 
* `ce` — **count equal** — see above, except this dice modifier counts how many die roll results 
_equal_ the value of the parameter. For the die roll results above, a throw of `4d6cu3` will have 
**1** as its result (since only the second die rolled a value of 3).
* `kh` — **keep highest** — in a throw of multiple dice, will only keep the number (of the ones
with the highest roll result) that equals the parameter value. For example, a throw of `4d6kh2` 
will roll four six-sided dice, but will only count the results of two of them with the highest
die roll result, so out of the die roll results of [1, 3, 4, 6] only 4 and 6 will be counted, with 
the total being 10.
* `kl` — **keep lowest** — see above, except only the lowest results will be counted, so, from the 
example above, for a throw of `4d6kl2`, only 1 and 3 will be counted, with the total being 4.
* `ro` — **re-roll** (if) **over** — will re-roll any die in a throw that rolls over the parameter 
value. For example, a throw of `4d6ro4` will re-roll any of the four six-sided dice in it if their
die roll result will be 5 or 6. The maximum number of times this can happen is 10 by default (see 
`rt` for limiting it further). If you want your six-sided dice to _never_ land on 5 or 6, consider 
rolling a four-sided die instead.  
* `ru` — **re-roll** (if) **under** — see above, except this dice modifier will make a die re-roll 
if its die roll result is _under_ the parameter value. So `4d6ru3` will re-roll any of the six-sided 
dice in it if their die roll result would be 1 or 2. Again, if you want your six-sided dice to 
_never_ land on a 1 or 2, consider rolling a d4 with a static bonus of 2.
* `re` — **re-roll** (if) **equals** — see above, except this dice modifier will make a die re-roll 
if its die roll result _equals_ the parameter value. So `4d6re3` will re-roll any of the six-sided 
dice in it if their die roll result would be 3.
* `rto` — **re-roll** (if) **total over** — will re-roll any dice throws if their _total_ result is 
over the parameter value. Unlike `ro`, this is not applied to the individual dice in a throw, but
to an entire throw, so that `4d6rto12` will re-roll the entire throw of four six-sided dice if
the total sum of the individual die roll results of all four is over 12. Again, the maximum number
of re-rolls can be controlled by the `rt` dice modifier.
* `rtu` — **re-roll** (if) **total under** — see above, except the total result must be _under_ the
parameter value for the throw to be re-rolled.
* `rte` — **re-roll** (if) **total equals** — see above, except the total result must _equal_ the
parameter value for the throw to be re-rolled.
* `rt` — **re-roll times** — will set the maximum number of times a die or a dice throw can be
re-rolled via the `rt`, `ru`, `re`, `rto`, `rtu`, or `rte` dice modifiers. The maximum number is 10.
* `cr` — **critical** (on) — if any die in a dice throw has its result equal to or higher than the 
parameter value, the entire throw is considered to be a critical success, automatically passing the
versus check (see the "Versus-checks" section below). Example: `1d20cr20` will "crit" on a 
natural 20. 
* `bo` — **botch** (on) — the opposite of the above `cr`, this dice modifier will make the entire
throw be considered a critical failure, automatically failing the versus check as well, if any die
in a dice throw has its result equal to or lower than the parameter value.
* `br` — **brutal** — an almost-equivalent dice modifier to `ru`, the only difference being that 
the die is re-rolled if the die roll result is less than _or equal to_ the parameter value. Used 
as a short-hand for fourth edition Dungeons and Dragons. 

### Special dice
#### FUDGE dice
In principle, FUDGE dice are three-sided dice with the values on their sides being `+`, `-` or `0`.
A roll of FUDGE dice uses four of such dice, and then combines their values, counting `+` as 1,
`-` as -1, and `0` as 0.

You can roll FUDGE dice using any of the following ways: `!r f`, `!r df`, `!r 4df`, or `!r fudge`. 
The results of such a roll would look something like this:
> 4dF = [-++0] = **1**

You can add static bonuses and penalties to a FUDGE dice roll, just as you can to any other dice:

```!r 4dF + 2 - 1```
> 4dF + 2 - 1 = [-+-0] + _1_ = **0**

You cannot use dice modifiers with FUDGE dice.

#### Roll and Keep dice
Some game systems, such as "Legend of Five Rings" and "Seventh Sea" use Roll and Keep dice:

```!r 4k2```

This command will roll **four** ten-sided dice and keep the **two** of them with the highest die 
roll results. Also, by default, any of these dice will "explode" (see the Dice modifiers section 
for an explanation of what that means) on a natural 10. This behavior can be changed by using the 
`e` dice modifier, for example, `!r 4k2e9` will mean that any of the rolled dice will explode on a 
natural 9 or 10; on the other hand, `!r 4k2e0` will disable explosions altogether.

#### Dungeons and Dragons (fourth edition) dice
This shorthand allows you to roll one twenty-sided die which will have a critical success on a
natural 20 and a critical failure on a natural 1:

```!r dnd4```

As of now, the other effects, such as maximizing the roll results in a conditional throw on a 
critical success, are not yet implemented.

## Repeating a command part
An entire command part with multiple dice and static modifiers can be repeated a number of times by 
using a `|` symbol followed by a number at the end of the formula, like this:

```!r 1d20+5 - 2d6 | 3```

This will roll one twenty-sided die, add five to its die roll result, then subtract a result of a
throw of two six-sided dice from that, and this whole calculation will be performed three times.

The maximum number of such repeats is 10.

If there are versus-checks specified (see the "Conditional command parts" section below), then the 
highest of this number, and the number of versus checks is used to calculate the number of repeats.

As a backwards-compatibility feature, `aoe` is a synonym for the `|` symbol.

## Versus-checks
The total result of a command part can be compared to a value, and the result of that comparison 
can be displayed using the versus-checks. Simply put `vs` followed by some numerical value after 
the formula (and after the repeat-clause, see "Repeating a command part" section above). For 
example:

```!r 1d20 + 5 vs 15```

This will roll one twenty-sided die and add five to the result of its die roll result. Then, 
depending on whether that total is less than 15 or not, this can either result in a failure:
> 1d20 + 5 = 5 + _5_ = **10** vs 15, _failure_

Or a success:
> 1d20 + 5 = 19 + _5_ = **24** vs 15, **success**

Note that the result of 15 will also be considered a success.

You can enter several values after `vs` if you separate them by a comma. For example:

```!r 1d20+5 vs 14,15,16```

Will result in something like this:
> 1d20 + 5 (3 rolls): 
> * Roll 1: 19 + _5_ = **24** vs 14, **success**;
> * Roll 2: 20 + _5_ = **25** vs 15, **success**;
> * Roll 3: 1 + _5_ = **6** vs 16, _failure_.

Note that if there is a repeat-clause specified (see "Repeating a command part" section above), 
the number of command part repeats will be the highest of the number of versus-checks, and the 
number of repeats. In case the number of repeats is higher, no versus-checks will be applied to
the command part repeats that aren't specifically covered by the versus-checks:

```!r 1d20+5 | 3 vs 15```
> 1d20 + 5 (3 rolls):
> * Roll 1: 5 + _5_ = **10** vs 15, _failure_;
> * Roll 2: 8 + _5_ = **13**;
> * Roll 3: 16 + _5_ = **21**.

You can also use entire formulas for versus checks:

```!r 1d20+5 vs 1d10+10```
> 1d20 + 5 = 15 + _5_ = **20** vs 2 + _10_ = 12, **success**

The result of the versus-checks can affect the next command part. See the "Conditional command 
parts" section for more information about that.

## Comments
A command part can have a comment that will be displayed in the results. To add a comment to a 
command part, add a `?` symbol and follow it with your comment's text. For example:

```!r 1d20 + 5-2d6 ? Some Comment```

Will return:
> `Some Comment:` 1d20 + 5 - 2d6 = 15 - [1 + 2] + _5_ = **17**

Note that you can use any symbols in the comment, except the symbols for separating the command 
parts (see the "Multiple command parts" and "Conditional command parts" sections).

Also note that the comment must be the very last thing in a command part, placed after the 
entire formula, the repeat-clause (see "Repeating a command part" section above), and the 
versus-checks (see the "Versus-checks" section).

You can also make it so that the comment is appended to the command part result, instead of being 
prepended, as usual. For that, use `?!` instead of the `?` symbol, like so:

```!r 1d20 + 5-2d6 ?! Some Comment```

Which will return:
> 1d20 + 5 - 2d6 = 15 - [1 + 2] + _5_ = **17** `Some Comment`

## Multiple command parts
Your roll command can have multiple command parts that are independent of each other and therefore 
produce independent results. Each command part is separated from another by the `;` symbol. For 
example:

```!r 1d20+2; 2d6-3```

Will roll one twenty-sided die and add two to its die roll result, then, separately, roll two 
six-sided dice and subtract three from the result of that throw. These two results will not be 
added together and will be displayed separately like so:
> 1d20 + 2 = 1 + _2_ = **3**;
> 2d6 - 3 = [5 + 5] - _3_ = **7**.

## Conditional command parts
A command part can be calculated or ignored based on the result of a versus-check (see the 
"Versus-checks" section above for more information about them) in a previous command part. A basic 
example of this in action is a roll of damage being conditional on whether an attack roll was 
successful or not:

```!r 1d20+5 vs 15 ? Attack roll => 1d10 ? Damage roll```

You can see that `=>` is used instead of the `;` symbol to separate these two command parts. 
In this roll command, the second command part will only be calculated if the versus-check in the 
first part is successful:
> Attack roll: 1d20 + 5 = 18 + _5_ = **23** vs 15, **success** → Damage roll: 1d10 = **4**

Otherwise, the second command part will be ignored entirely:
> Attack roll: 1d20 + 5 = 3 + _5_ = **8** vs 15, _failure_

If there is no versus-check in a command part before the `=>` separator, then the versus-check is 
automatically considered to be successful.

You can chain conditional command parts together like this:

```!r 1d20vs10 => 1d10vs5 => 1d6```

In this case, if the versus-check in the first command part fails, both of the command parts after 
it will be skipped.

You can also repeat and re-roll versus checks without having to type them multiple times. For 
example, let's say you want to roll one six-sided die ten times and compare each roll against a
value of 5. Instead of doing this:

```!r 1d6 vs 5, 5, 5, 5, 5, 5, 5, 5, 5, 5```

You can do this:

```!r 1d6 | 10 vs 5=```

This even works if you have to check against a few different values before checking against the
repeated one:

```!r 1d6 | 3 vs 4, 5=```
> 1d6 (3 rolls):
> * Roll 1: **5** vs 4, **success**;
> * Roll 2: **1** vs 5, _failure_;
> * Roll 3: **5** vs 5, **success**.

This also works if you use a formula with dice in it: the result of the roll will be repeated for
each versus check:

```!r 1d6 | 3 vs 5=```
> 1d6 (3 rolls):
> * Roll 1: **3** vs 5, _failure_;
> * Roll 2: **6** vs 5, **success**;
> * Roll 3: **3** vs 5, _failure_.

If you want your throw in the versus check re-rolled each time, you can use `...` instead of `=`:

```!r 1d6 | 3 vs 1d6...```
> 1d6 (3 rolls):
> * Roll 1: **5** vs 3, **success**;
> * Roll 2: **3** vs 4, _failure_;
> * Roll 3: **1** vs 2, _failure_.

## Reply interactivity
Once Dicecord finished processing your roll command (and if all goes well), it will send you a 
reply with the results of your roll command. Additionally, however, it will provide you some things
you can do with these results. It will do that by adding reactions to its reply. If you click on 
either of them, Dicecord will react to that:

* 🅱 [B] — **BB-code** — will reply with the results of your roll command formatted in BB-code (used in 
forums)
* Ⓜ (M) — **Markdown** — will reply with the results of your roll command formatted in markdown
* ♻ (Recycle) — **Re-roll** — will reply with the same roll command re-rolled

Note that due to some technical limitations, the interactivity will only be functional for 10 
minutes after the reply.

## Warnings
If your roll command contains some things that Dicecord could not properly parse or that do not 
make sense to it, before rolling it, it will reply to you with the list of all the warnings it 
found. It will provide you with what the roll command that it understood will look like, and it 
will ask you whether it should proceed with that partial command.

If you choose for it to do so (via clicking the ✅ (check) reaction), Dicecord will roll the command as 
best as it understood it, ignorning the parts that it couldn't.

If you choose to not do that (via clicking the 🚫 (no) reaction), Dicecord will instead give you the 
unformatted text of your roll command, so you can copy it, edit the command, and then send it again.

Note that due to some technical limitations, the warnings will only remain active for 5 minutes.