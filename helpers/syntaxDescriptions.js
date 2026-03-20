// Concise descriptions of roll command syntax elements.
// Used by the /help command for quick inline lookup.
const descriptions = {
  'vs': {
    name: 'Versus check',
    syntax: '`[formula] vs [value]`',
    example: [
      '`1d20+5 vs 15` — check if result ≥ 15',
      '`1d20+5 vs 14, 15, 16` — three checks against different values',
      '`1d6 | 10 vs 5=` — ten checks against a repeated value of 5',
      '`1d6 | 3 vs 1d6...` — re-roll the versus value each time'
    ],
    description:
      'Compares the total result of a formula against a target value. ' +
      'Result ≥ target is a **success**, otherwise a **failure**.\n' +
      'Multiple comma-separated values create multiple checks. ' +
      'Append `=` to repeat the last value, or `...` to re-roll it each time.'
  },
  'vst': {
    name: 'Versus check with total',
    syntax: '`[formula] vst [value]`',
    example: '`1d20+5 | 5 vst 15=` — five checks with total success count',
    description:
      'Works exactly like `vs`, but adds a total success count at the end of repeated checks.\n' +
      'Example output: `Total: **3** / 5 successes.`'
  },
  'repeat': {
    name: 'Repeating a command part',
    syntax: '`[formula] | [N]`',
    example: [
      '`1d20+5 | 3` — roll the formula 3 times',
      '`1d20+5 | 5 vs 15=` — roll 5 times with versus checks'
    ],
    description:
      'Repeats the entire formula N times. Maximum is 10.\n' +
      'If versus checks are specified, the repeat count is the higher of N and the number of vs values.\n' +
      '`aoe` is a synonym for `|` (for backwards compatibility).'
  },
  'conditional': {
    name: 'Conditional command parts',
    syntax: '`[part1] => [part2]`',
    example: [
      '`1d20+5 vs 15 => 1d10` — damage only on a hit',
      '`1d20vs10 => 1d10vs5 => 1d6` — chained conditionals'
    ],
    description:
      'The part after `=>` is only calculated if the versus check in the previous part succeeded. ' +
      'If it failed, the conditional part (and any further chained `=>` parts) are skipped entirely.'
  },
  'comments': {
    name: 'Comments',
    syntax: '`[formula] ? [text]` / `[formula] ?! [text]`',
    example: [
      '`1d20+5 ? Attack roll` — comment before result',
      '`1d20+5 ?! Attack roll` — comment after result'
    ],
    description:
      'Adds a label to a command part. Use `?` to prepend or `?!` to append the comment.\n' +
      'Must be the last thing in a command part (after formula, repeat, and versus checks).'
  },
  'multiple parts': {
    name: 'Multiple command parts',
    syntax: '`[part1] ; [part2]`',
    example: '`1d20+2; 2d6-3` — two independent rolls in one command',
    description:
      'Separate independent command parts with `;`. ' +
      'Each part is calculated and displayed separately.'
  },
  'parentheses': {
    name: 'Parentheses',
    syntax: '`[N]d[S] + ([formula])`',
    example: '`3 - (1+2)` — equivalent to `3 - 1 - 2`',
    description:
      'Group parts of a formula with parentheses, just like in arithmetic. ' +
      'Maximum nesting depth is 5.'
  }
}

module.exports = descriptions

