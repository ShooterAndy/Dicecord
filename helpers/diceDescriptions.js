// Concise descriptions of special dice types available in the /roll command.
// Used by the /help command for quick inline lookup.
const descriptions = {
  'fudge': {
    name: 'FUDGE dice',
    syntax: '`f` / `df` / `4df` / `fudge`',
    example: [
      '`4df` → [-++0] = **1**',
      '`4dF + 2 - 1` → [-+-0] + _1_ = **0**'
    ],
    description:
      'Three-sided dice with values `+` (1), `-` (-1), and `0`. ' +
      'A standard FUDGE roll uses four dice and sums the results.\n' +
      'Static bonuses and penalties can be applied, but dice modifiers cannot.'
  },
  'rnk': {
    name: 'Roll and Keep dice',
    syntax: '`[N]k[KEEP]`',
    example: [
      '`4k2` — roll 4 ten-sided dice, keep the highest 2',
      '`4k2e9` — explode on 9 or 10 instead of just 10',
      '`4k2e0` — disable explosions'
    ],
    description:
      'Used in game systems like "Legend of Five Rings" and "Seventh Sea". ' +
      'Rolls N ten-sided dice and keeps the KEEP highest results. ' +
      'By default, dice explode on a natural 10. Use the `e` modifier to change or disable this.'
  },
  'dnd4': {
    name: 'D&D (4th edition) dice',
    syntax: '`dnd4`',
    example: '`dnd4` — roll 1d20, crit on 20, botch on 1',
    description:
      'Shorthand for rolling one twenty-sided die with a critical success on a natural 20 ' +
      'and a critical failure on a natural 1.'
  },
  'fcd': {
    name: 'Fallout combat dice',
    syntax: '`fcd` / `[N]fcd`',
    example: [
      '`fcd` — roll one Fallout combat die',
      '`2fcd` — roll two Fallout combat dice'
    ],
    description:
      'A special six-sided die from the Fallout 2d20 system. ' +
      'Possible results are 1, 2, 0, 0, 1, 1 — so it can roll 0, 1, or 2, ' +
      'with 1 being the most probable.'
  },
  'dh': {
    name: 'Daggerheart Duality dice',
    syntax: '`dh`',
    example: [
      '`dh` — roll Hope and Fear dice',
      '`dh + 1d6` — with advantage die',
      '`dh - 1d6` — with disadvantage die'
    ],
    description:
      'Rolls two twelve-sided dice: the first is the Hope die, the second is the Fear die. ' +
      'If Hope > Fear, it\'s a roll with **Hope**. If Fear > Hope, it\'s a roll with **Fear**. ' +
      'If they\'re equal, it\'s a **critical success**.'
  }
}

module.exports = descriptions

