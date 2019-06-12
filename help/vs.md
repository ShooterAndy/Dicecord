**vs** is a modifier for your `!roll` command rolls. It should be placed as the last part of the roll, right before the comment, like so:

`!roll 1d20+5 aoe 3 vs 10, 14, 15 ? comment goes here`

This example will roll one twenty-sided die three times, adding a bonus of 5 to each of the results, and will compare those results to the values after the `vs`, in order. An example result would look like this:

1d20 + 5 (3 rolls):
* Roll 1: 10 + _5_ = **15** vs 10, **success**;
* Roll 2: 5 + _5_ = **10** vs 14, _failure_;
* Roll 3: 19 + _5_ = **24** vs 15, **success**.

If all of the values you wish to check for are the same, you don't need to repeat them, just type it once after the `vs`.

You can also make conditional rolls by using `=>` instead of `;` to separate them if you use `vs`, like this:

```!roll 1d20+8 vs 21 ? Attack roll => 1d8+4+1d6 ?! damage to enemy```

Note that if at least one roll in a multiple roll set (using `aoe` or `x`) succeeds, the conditional roll will be made. 