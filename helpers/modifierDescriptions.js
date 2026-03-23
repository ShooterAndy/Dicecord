const { DICE_MODIFIERS } = require('./constants')

// Concise descriptions of each roll modifier, keyed by abbreviation.
// Used by the /modifier command for quick inline lookup.
const descriptions = {
  [DICE_MODIFIERS.explode]: {
    name: 'Explode',
    syntax: '[N]d[S]e[VALUE]',
    default: 'Number of die sides',
    example: '`4d6e6` — roll four six-sided dice, any die that rolls a 6 explodes',
    description:
      'Makes any single die "explode" if its result is equal to or over the value, ' +
      'meaning the die is rolled again and the new result is added to the previous one. \n' +
      'Chains up to 10 times by default (see `t`).'
  },
  [DICE_MODIFIERS.explodeSeparately]: {
    name: 'Explode separately',
    syntax: '[N]d[S]es[VALUE]',
    default: 'Number of die sides',
    example: [
      '`4d6es6` — roll four six-sided dice, each of which will explode on a 6',
      '`4d6es6hv5` — roll 4d6, explosions are separate dice, count hits ≥ 5',
      '`4d6es6kh3` — expand pool first, then keep highest 3',
      '`4d6kh3es5` — keep highest 3 first, only those can explode'
    ],
    description:
      'Works like `e`, but each explosion roll is added to the dice pool as a **separate die** ' +
      'instead of being summed into the original. Useful with counting modifiers like `co`/`hv` ' +
      'where each explosion should count individually. Explosion dice are marked with 💥.\n' +
      'Mutually exclusive with `e`.\n' +
      'The order relative to `kh`/`kl` matters: `4d6es6kh3` expands the pool first, then keeps; ' +
      '`4d6kh3es5` keeps first, then only kept dice can explode.'
  },
  [DICE_MODIFIERS.explodeTimes]: {
    name: 'Explode times',
    syntax: '[N]d[S]e[V]t[TIMES]',
    default: '1',
    example: '`4d6e6t1` — a die that explodes won\'t explode a second time',
    description:
      'Sets the maximum number of times a die can explode in a row. ' +
      'Works with both `e` and `es`.'
  },
  [DICE_MODIFIERS.countOver]: {
    name: 'Count over',
    syntax: '[N]d[S]co[VALUE]',
    default: null,
    example: '`4d6co3` with results [1, 3, 4, 6] → **2** (the 4 and the 6)',
    description:
      'Counts how many dice in the throw rolled strictly **over** the value.'
  },
  [DICE_MODIFIERS.countUnder]: {
    name: 'Count under',
    syntax: '[N]d[S]cu[VALUE]',
    default: null,
    example: '`4d6cu3` with results [1, 3, 4, 6] → **1** (only the 1)',
    description:
      'Counts how many dice rolled strictly **under** the value.'
  },
  [DICE_MODIFIERS.countEqual]: {
    name: 'Count equal',
    syntax: '[N]d[S]ce[VALUE]',
    default: null,
    example: '`4d6ce3` with results [1, 3, 4, 6] → **1** (only the 3)',
    description:
      'Counts how many dice rolled **exactly** the value.'
  },
  [DICE_MODIFIERS.countEqualOver]: {
    name: 'Count equal/over',
    syntax: '[N]d[S]ceo[VALUE]',
    default: null,
    example: '`4d6ceo4` with results [1, 3, 4, 6] → **2** (the 4 and the 6)',
    description:
      'Counts how many dice rolled **equal to or over** the value. ' +
      'Alias: `hv` (hits versus).'
  },
  [DICE_MODIFIERS.countEqualUnder]: {
    name: 'Count equal/under',
    syntax: '[N]d[S]ceu[VALUE]',
    default: null,
    example: '`4d6ceu3` with results [1, 3, 4, 6] → **2** (the 1 and the 3)',
    description:
      'Counts how many dice rolled **equal to or under** the value. ' +
      'Alias: `mv` (misses versus).'
  },
  [DICE_MODIFIERS.hitsVersus]: {
    name: 'Hits versus',
    syntax: '[N]d[S]hv[VALUE]',
    default: null,
    example: '`10d6hv5` — count how many of 10 six-sided dice rolled 5 or higher',
    description:
      'Alias for `ceo` (count equal/over). Counts how many dice rolled **equal to or over** the value.'
  },
  [DICE_MODIFIERS.missesVersus]: {
    name: 'Misses versus',
    syntax: '[N]d[S]mv[VALUE]',
    default: null,
    example: '`10d6mv2` — count how many of 10 six-sided dice rolled 2 or lower',
    description:
      'Alias for `ceu` (count equal/under). Counts how many dice rolled **equal to or under** the value.'
  },
  [DICE_MODIFIERS.keepHighest]: {
    name: 'Keep highest',
    syntax: '[N]d[S]kh[COUNT]',
    default: '1',
    example: '`4d6kh3` — roll 4d6, keep the 3 highest (classic D&D ability score roll)',
    description:
      'Keeps only the highest [COUNT] dice from the throw; the rest are ignored.'
  },
  [DICE_MODIFIERS.keepLowest]: {
    name: 'Keep lowest',
    syntax: '[N]d[S]kl[COUNT]',
    default: '1',
    example: '`2d20kl1` — roll 2d20, keep the lowest (disadvantage)',
    description:
      'Keeps only the lowest [COUNT] dice from the throw; the rest are ignored.'
  },
  [DICE_MODIFIERS.reRollIfOver]: {
    name: 'Re-roll if over',
    syntax: '[N]d[S]ro[VALUE]',
    default: null,
    example: '`4d6ro4` — re-roll any die that lands on 5 or 6',
    description:
      'Re-rolls any die that rolled **over** the value. ' +
      'Max re-rolls: 10 by default (see `rt`).'
  },
  [DICE_MODIFIERS.reRollIfUnder]: {
    name: 'Re-roll if under',
    syntax: '[N]d[S]ru[VALUE]',
    default: null,
    example: '`4d6ru3` — re-roll any die that lands on 1 or 2',
    description:
      'Re-rolls any die that rolled **under** the value. ' +
      'Max re-rolls: 10 by default (see `rt`).'
  },
  [DICE_MODIFIERS.reRollIfEquals]: {
    name: 'Re-roll if equals',
    syntax: '[N]d[S]re[VALUE]',
    default: null,
    example: '`4d6re1` — re-roll any die that lands on 1',
    description:
      'Re-rolls any die that rolled **exactly** the value. ' +
      'Max re-rolls: 10 by default (see `rt`).'
  },
  [DICE_MODIFIERS.reRollIfTotalOver]: {
    name: 'Re-roll if total over',
    syntax: '[N]d[S]rto[VALUE]',
    default: null,
    example: '`4d6rto20` — re-roll all four dice if their sum exceeds 20',
    description:
      'Re-rolls the **entire throw** if the total sum of all dice is over the value.'
  },
  [DICE_MODIFIERS.reRollIfTotalUnder]: {
    name: 'Re-roll if total under',
    syntax: '[N]d[S]rtu[VALUE]',
    default: null,
    example: '`4d6rtu8` — re-roll all four dice if their sum is below 8',
    description:
      'Re-rolls the **entire throw** if the total sum is under the value.'
  },
  [DICE_MODIFIERS.reRollIfTotalEquals]: {
    name: 'Re-roll if total equals',
    syntax: '[N]d[S]rte[VALUE]',
    default: null,
    example: '`4d6rte4` — re-roll all four dice if their sum is exactly 4',
    description:
      'Re-rolls the **entire throw** if the total sum exactly equals the value.'
  },
  [DICE_MODIFIERS.reRollTimes]: {
    name: 'Re-roll times',
    syntax: '[N]d[S]rt[TIMES]',
    default: '1',
    example: '`4d6ru3rt2` — re-roll dice under 3, but at most 2 times each',
    description:
      'Sets the maximum number of times a die or throw can be re-rolled via `ro`, `ru`, `re`, ' +
      '`rto`, `rtu`, or `rte`. Maximum is 10.'
  },
  [DICE_MODIFIERS.critical]: {
    name: 'Critical on',
    syntax: '[N]d[S]cr[VALUE]',
    default: 'Number of die sides',
    example: '`1d20cr20` — crit on a natural 20',
    description:
      'If any die rolls equal to or higher than the value, the throw is a **critical success**, ' +
      'automatically passing any versus check.'
  },
  [DICE_MODIFIERS.botch]: {
    name: 'Botch on',
    syntax: '[N]d[S]bo[VALUE]',
    default: '1',
    example: '`1d20bo1` — botch on a natural 1',
    description:
      'If any die rolls equal to or lower than the value, the throw is a **critical failure**, ' +
      'automatically failing any versus check.'
  },
  [DICE_MODIFIERS.invertedCritical]: {
    name: 'Inverted critical on',
    syntax: '[N]d[S]icr[VALUE]',
    default: '1',
    example: '`1d20icr1` — crit on a natural 1 (low is good)',
    description:
      'The opposite of `cr`. If any die rolls equal to or **lower** than the value, the throw ' +
      'is a **critical success**, automatically passing any versus check. ' +
      'Useful for roll-under systems where low results are desirable.'
  },
  [DICE_MODIFIERS.invertedBotch]: {
    name: 'Inverted botch on',
    syntax: '[N]d[S]ibo[VALUE]',
    default: 'Number of die sides',
    example: '`1d20ibo20` — botch on a natural 20 (high is bad)',
    description:
      'The opposite of `bo`. If any die rolls equal to or **higher** than the value, the throw ' +
      'is a **critical failure**, automatically failing any versus check. ' +
      'Useful for roll-under systems where high results are undesirable.'
  },
  [DICE_MODIFIERS.brutal]: {
    name: 'Brutal',
    syntax: '[N]d[S]br[VALUE]',
    default: '1',
    example: '`2d6br1` — re-roll any die that lands on 1',
    description:
      'Re-rolls any die that rolled **equal to or under** the value. ' +
      'Similar to `ru` but includes the exact value. D&D 4e shorthand.'
  }
}

module.exports = descriptions




