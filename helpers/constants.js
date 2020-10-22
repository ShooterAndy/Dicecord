module.exports.DEFAULT_DECK_TYPE = 'poker';
module.exports.DECK_TYPES_DB_NAME = 'deck_types';
module.exports.DECK_TYPES_COLUMNS = { id: 'id', deck: 'deck', description: 'description' };

module.exports.DECKS_DB_NAME = 'decks';
module.exports.DECKS_COLUMNS = { channel_id: 'channel_id', deck: 'deck', type_id: 'type_id' };

module.exports.HANDLED_ERROR_TYPE_NAME = 'HANDLED_ERROR'
module.exports.HANDLED_WARNING_TYPE_NAME = 'HANDLED_WARNING'

module.exports.ERROR_PREFIX = ':exclamation:_Error:_ '
module.exports.WARNING_PREFIX = ':warning: _Warning:_ '
module.exports.WARNINGS_PREFIX = ':warning: _Warnings:_\n'

module.exports.MAX_PARENTHESES_LEVEL = 5
module.exports.OPENING_PARENTHESES_REPLACER = '{'
module.exports.CLOSING_PARENTHESES_REPLACER = '}'

module.exports.MAX_REPEAT_THROWS = 10

module.exports.FORMULA_PART_TYPES = {
  operators: {
    sum: '+',
    subtract: '-'
  },
  operands: {
    number: 'number',
    normalDice: 'normalDice',
    fudgeDice: 'fudgeDice',
    child: 'child'
  }
}

module.exports.NORMAL_DICE_SYMBOL = 'd'
module.exports.MAX_DICE_NUMBER = 100
module.exports.MAX_DIE_SIDES = 10000
module.exports.MAX_EXPLOSIONS = 10
module.exports.MAX_RE_ROLLS = 10
module.exports.DICE_MODIFIERS = {
  explode: 'e',
  explodeTimes: 't',
  countOver: 'co',
  countUnder: 'cu',
  countEqual: 'ce',
  keepHighest: 'kh',
  keepLowest: 'kl',
  reRollIfOver: 'ro',
  reRollIfUnder: 'ru',
  reRollIfEquals: 're',
  reRollIfTotalOver: 'rto',
  reRollIfTotalUnder: 'rtu',
  reRollIfTotalEquals: 'rte',
  reRollTimes: 'rt',
  critical: 'cr',
  // synonyms
  brutal: 'br'
}

module.exports.FUDGE_DICE_NUMBER = 4
module.exports.FUDGE_DIE_SIDES = 3 // I know it's supposed to be 6, but who cares
module.exports.FUDGE_RESULT_SYMBOLS = ['-', '0', '+']
module.exports.FUDGE_SYMBOL = 'f'
module.exports.FUDGE_DICE_SYMBOLS = [
  this.FUDGE_SYMBOL,
  `${this.NORMAL_DICE_SYMBOL}${this.FUDGE_SYMBOL}`,
  `${this.FUDGE_DICE_NUMBER}${this.NORMAL_DICE_SYMBOL}${this.FUDGE_SYMBOL}`,
  'fudge'
]

module.exports.YES_EMOJI = '✅'
module.exports.NO_EMOJI = '🚫'

// These symbols have to be case independent
module.exports.THROW_SEPARATOR = ';'
module.exports.COMMENT_SEPARATOR = '?'
module.exports.APPEND_COMMENT_SEPARATOR = '?!'

// These do not have to be
module.exports.VERSUS_SEPARATOR = 'vs'
module.exports.VERSUS_PARTS_SEPARATOR = ','
module.exports.REPEAT_THROW_SEPARATOR = '|'

// -------------------------------------------------------------------------------------------------
// If the symbols in this section are expanded, don't forget to expand ALLOWED_SYMBOLS
module.exports.OPENING_PARENTHESIS = '('
module.exports.CLOSING_PARENTHESIS = ')'

// These have to be one symbol long
module.exports.PLUS_SIGN = '+'
module.exports.MINUS_SIGN = '-'
// -------------------------------------------------------------------------------------------------
module.exports.ALLOWED_SYMBOLS = [
  this.PLUS_SIGN, this.MINUS_SIGN, this.OPENING_PARENTHESIS, this.CLOSING_PARENTHESIS
]

module.exports.UNRECOGNIZED_FORMULA_REGEX = '[^A-Za-z\\d\{\}\\s]+'
module.exports.NUMERICAL_REGEX = '^\\d+$'
// -------------------------------------------------------------------------------------------------
module.exports.RESULT_TYPES = {
  final: 'final',
  ignored: 'ignored',
  exploded: 'exploded',
  critical: 'critical'
}
// -------------------------------------------------------------------------------------------------
module.exports.THROW_RESULTS_FORMATS = {
  discord: {
    boldStart: '**',
    boldEnd: '**',
    italicsStart: '_',
    italicsEnd: '_',
    listStart: '',
    listEnd: '',
    listItemStart: ' * ',
    listItemEnd: '',
    codeStart: '`',
    codeEnd: '`',
    strikethroughStart: '~~',
    strikethroughEnd: '~~',
    underlineStart: '__',
    underlineEnd: '__',
    throwsStart: '',
    throwSeparator: ';\n',
    throwsEnd: '',
    space: ' ',
    explosion: '💥',
    critical: '✨',
    botch: '🔥',
    resultsStart: '(',
    resultsEnd: ')'
  }
}
module.exports.DEFAULT_THROW_RESULT_FORMAT_NAME = Object.keys(this.THROW_RESULTS_FORMATS)[0]