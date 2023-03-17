module.exports.IS_LOCAL = process.env.IS_LOCAL === 'true' || false
module.exports.USE_INTERACTIVE_REACTIONS = process.env.USE_INTERACTIVE_REACTIONS === 'true' || false
module.exports.USE_PARTIALS = true

// -------------------------------------------------------------------------------------------------

module.exports.LOG_TYPES = {
  error: 'ERROR',
  warning: 'WARNING',
  info: 'INFO'
}
module.exports.ADMINISTRATOR_ID = process.env.ADMINISTRATOR_ID
module.exports.LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID
module.exports.LOG_PREFIX = '-- > '

// -------------------------------------------------------------------------------------------------

module.exports.DB_PREFIX = 'public'

module.exports.PREFIXES_DB_NAME = 'prefixes'
module.exports.PREFIXES_COLUMNS = { guild_id: 'guild_id', prefix: 'prefix' }

module.exports.CUSTOM_DECK_TYPE = 'custom'
module.exports.CARD_SEPARATOR = ','
module.exports.MAX_DEAL_TARGETS = 10
module.exports.DEFAULT_DECK_TYPE = 'poker'
module.exports.DECK_TYPES_DB_NAME = 'deck_types'
module.exports.DECK_TYPES_COLUMNS = { id: 'id', deck: 'deck', description: 'description' }

module.exports.DECKS_DB_NAME = 'decks'
module.exports.DECKS_COLUMNS = {
  channel_id: 'channel_id',
  deck: 'deck',
  type_id: 'type_id',
  timestamp: 'timestamp'
}
module.exports.DECKS_EXPIRE_AFTER = '30 days'

module.exports.SAVED_ROLL_COMMANDS_DB_NAME = 'saved_roll_commands'
module.exports.SAVED_ROLL_COMMANDS_COLUMNS = {
  user_id: 'user_id', name: 'name', command: 'command', timestamp: 'timestamp'
}
module.exports.SAVED_ROLL_COMMANDS_EXPIRE_AFTER = '30 days'
module.exports.MAX_SAVED_ROLL_COMMANDS_PER_USER = 10
module.exports.UPSERT_SAVED_ROLL_COMMAND_RESULTS = {
  inserted: 'inserted',
  updated: 'updated',
  limit: 'limit'
}
module.exports.MAX_SAVED_ROLL_COMMAND_NAME_LENGTH = 16

module.exports.MESSAGES_DB_NAME = 'messages'
module.exports.MESSAGES_COLUMNS = {
  message_id: 'message_id',
  channel_id: 'channel_id',
  timestamp: 'timestamp',
  type: 'type',
  content: 'content',
  user_id: 'user_id'
}
module.exports.MESSAGE_TYPES = {
  warning: 'warning',
  rollResult: 'roll'
}
module.exports.WARNING_MESSAGE_EXPIRE_AFTER_INT = 5
module.exports.WARNING_MESSAGE_EXPIRE_AFTER = `${this.WARNING_MESSAGE_EXPIRE_AFTER_INT} minutes`
module.exports.ROLL_RESULTS_MESSAGE_EXPIRE_AFTER_INT = this.SAVE_BUTTON_EXPIRE_AFTER_INT
module.exports.ROLL_RESULTS_MESSAGE_EXPIRE_AFTER =
  `${this.ROLL_RESULTS_MESSAGE_EXPIRE_AFTER_INT} minutes`

// -------------------------------------------------------------------------------------------------

module.exports.MAX_MESSAGE_LENGTH = 2000

// -------------------------------------------------------------------------------------------------

module.exports.MIN_ORDER_NUMBER = 2
module.exports.MAX_ORDER_NUMBER = 1000
module.exports.ORDER_UL_KEY = 'ul'
module.exports.ORDER_OL_KEY = 'ol'
module.exports.MIN_PICK_NUMBER = 2
module.exports.MAX_PICK_NUMBER = 1000

// -------------------------------------------------------------------------------------------------

const DISCORD_CODE_SYMBOL = '`'
module.exports.DISCORD_CODE_SYMBOL = DISCORD_CODE_SYMBOL
module.exports.DISCORD_CODE_REGEX = new RegExp(DISCORD_CODE_SYMBOL, 'g')

// -------------------------------------------------------------------------------------------------

module.exports.ICON_URL = 'https://shooterandy.github.io/Dicecord/img/logo-full.png'
module.exports.PRIMARY_COLOR = '#61c6b3'

// -------------------------------------------------------------------------------------------------

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
    dnd4Dice: 'dnd4Dice',
    rnkDice: 'rnkDice',
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
  countEqualOver: 'ceo',
  countEqualUnder: 'ceu',
  hitsVersus: 'hv', // alias for 'ceo'
  missesVersus: 'mv', // alias for 'ceu'
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
  botch: 'bo',
  // synonyms
  brutal: 'br'
}

module.exports.RNK_DICE_SYMBOL = 'k'
module.exports.RNK_DIE_SIDES = 10

module.exports.DND_DIE_SIDES = 20
module.exports.DND_DICE_NUM = 1
module.exports.DND_CRITICAL = this.DND_DIE_SIDES
module.exports.DND_BOTCH = 1

module.exports.DND4_SYMBOL = 'dnd4'

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
module.exports.B_EMOJI = '🅱️'
module.exports.M_EMOJI = 'Ⓜ'
module.exports.REPEAT_EMOJI = '♻'
module.exports.SAVE_EMOJI = '💾'

// These symbols have to be case independent
module.exports.COMMENT_SEPARATOR = '?'
module.exports.APPEND_COMMENT_SEPARATOR = '?!'

// These do not have to be
module.exports.THROW_SEPARATOR = ';'
module.exports.THROW_SEPARATOR_VS = '=>'
module.exports.VERSUS_SEPARATOR = 'vs'
module.exports.VERSUS_PARTS_SEPARATOR = ','
module.exports.VERSUS_REPEATER = '='
module.exports.VERSUS_REROLLER = '...'
module.exports.REPEAT_THROW_SEPARATOR = '|'
module.exports.REPEAT_THROW_SEPARATOR_AOE = 'aoe'

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
  critical: 'critical',
  botch: 'botch'
}
// -------------------------------------------------------------------------------------------------
module.exports.SPECIAL_THROW_RESULTS = {
  criticalSuccess: 'criticalSuccess',
  criticalFailure: 'criticalFailure',
  criticalSuccessDnD4: 'criticalSuccessDnD4',
  criticalFailureDnD4: 'criticalFailureDnD4'
}
// -------------------------------------------------------------------------------------------------
module.exports.VS_CHECK_RESULTS = {
  success: 'success',
  failure: 'failure',
  criticalDnD4: 'criticalDnD4',
  botchDnD4: 'botchDnD4'
}
// -------------------------------------------------------------------------------------------------
module.exports.SPECIAL_CONDITION_TYPES = {
  maximizeRolls: 'maximizeRolls',
  multiplyRolls: 'multiplyRolls',
  addRoll: 'addRoll'
}
// -------------------------------------------------------------------------------------------------
module.exports.SPECIAL_CONDITIONS = { }
this.SPECIAL_CONDITIONS[this.SPECIAL_THROW_RESULTS.criticalSuccessDnD4] = [
  {
    type: this.SPECIAL_CONDITION_TYPES.maximizeRolls
  }
]
// -------------------------------------------------------------------------------------------------
module.exports.THROW_RESULTS_FORMATS = {
  discord: {
    name: 'discord',
    boldStart: '**',
    boldEnd: '**',
    italicsStart: '_',
    italicsEnd: '_',
    listStart: '',
    listEnd: '',
    listItemStart: ' * ',
    listItemEnd: '',
    codeStart: DISCORD_CODE_SYMBOL,
    codeEnd: DISCORD_CODE_SYMBOL,
    strikethroughStart: '~~',
    strikethroughEnd: '~~',
    underlineStart: '__',
    underlineEnd: '__',
    throwsStart: '',
    throwSeparator: ';\n',
    throwsEnd: '.',
    space: ' ',
    explosion: '💥',
    critical: '✨',
    botch: '🔥',
    resultsStart: '[',
    resultsEnd: ']',
    vs: 'vs',
    conditionalThrowSeparator: '→',
    addThrowSeparatorAfterListEnd: false
  },
  markdown: {
    name: 'markdown',
    boldStart: '**',
    boldEnd: '**',
    italicsStart: '_',
    italicsEnd: '_',
    listStart: '',
    listEnd: '',
    listItemStart: '\n * ',
    listItemEnd: '',
    codeStart: '',
    codeEnd: '',
    strikethroughStart: '~~',
    strikethroughEnd: '~~',
    underlineStart: '__',
    underlineEnd: '__',
    throwsStart: '',
    throwSeparator: ';\n',
    throwsEnd: '.',
    space: ' ',
    explosion: '💥',
    critical: '✨',
    botch: '🔥',
    resultsStart: '[',
    resultsEnd: ']',
    vs: 'vs',
    conditionalThrowSeparator: '→',
    replaceLinebreaks: false,
    multipleListStarts: true,
    addThrowSeparatorAfterListEnd: false
  },
  bbcode: {
    name: 'bbcode',
    boldStart: '[b]',
    boldEnd: '[/b]',
    italicsStart: '[i]',
    italicsEnd: '[/i]',
    listStart: '[ul]',
    listEnd: '[/ul]',
    listItemStart: '[li]',
    listItemEnd: '[/li]',
    codeStart: '',
    codeEnd: '',
    strikethroughStart: '[strike]',
    strikethroughEnd: '[/strike]',
    underlineStart: '[u]',
    underlineEnd: '[/u]',
    throwsStart: '[ul][li]',
    throwSeparator: '[/li][li]',
    throwsEnd: '[/li][/ul]',
    space: ' ',
    explosion: '💥',
    critical: '✨',
    botch: '🔥',
    resultsStart: '(',
    resultsEnd: ')',
    vs: 'vs',
    conditionalThrowSeparator: '→',
    replaceLinebreaks: true,
    multipleListStarts: false,
    addThrowSeparatorAfterListEnd: true
  }
}
module.exports.DEFAULT_THROW_RESULT_FORMAT_NAME = Object.keys(this.THROW_RESULTS_FORMATS)[0]
// -------------------------------------------------------------------------------------------------
module.exports.DEFAULT_SLOTS_NUMBER = 3
module.exports.DEFAULT_SLOTS_SYMBOLS = ['🍒', '🔔', '🍀', '❤', '💎', '♦']
module.exports.MINIMUM_SLOTS_NUMBER = 2
module.exports.MAXIMUM_SLOTS_NUMBER = 10
module.exports.MINIMUM_SLOTS_SYMBOLS = 2
module.exports.MAXIMUM_SLOTS_SYMBOLS = 32
// -------------------------------------------------------------------------------------------------
module.exports.GENERIC_SAVE_BUTTON_ID = 'generic_save'
module.exports.SAVE_BUTTON_EXPIRE_AFTER_INT = 10

module.exports.SAVED_COMMANDS_DB_NAME = 'saved_commands'
module.exports.SAVED_COMMANDS_COLUMNS = {
  user_id: 'user_id',
  name: 'name',
  command: 'command',
  timestamp: 'timestamp',
  parameters: 'parameters'
}
module.exports.SAVED_COMMANDS_EXPIRE_AFTER = '30 days'
module.exports.MAX_SAVED_COMMANDS_PER_USER = 10
module.exports.UPSERT_SAVED_COMMAND_RESULTS = {
  inserted: 'inserted',
  updated: 'updated',
  limit: 'limit'
}
module.exports.MAX_SAVED_COMMAND_NAME_LENGTH = 16