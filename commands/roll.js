const random = require('random')
const _ = require('underscore')
const formatThrowResults = require('../helpers/formatThrowResults')

const nws = require('../helpers/nws')
const reply = require('../helpers/reply')
const logger = require('../helpers/logger')
const pg = require('../helpers/pgHandler')

const {
  HANDLED_ERROR_TYPE_NAME,
  HANDLED_WARNING_TYPE_NAME,

  ERROR_PREFIX,
  WARNING_PREFIX,
  WARNINGS_PREFIX,

  MAX_PARENTHESES_LEVEL,
  OPENING_PARENTHESES_REPLACER,
  CLOSING_PARENTHESES_REPLACER,

  MAX_REPEAT_THROWS,

  FORMULA_PART_TYPES,

  NORMAL_DICE_SYMBOL,
  MAX_DICE_NUMBER,
  MAX_DIE_SIDES,
  MAX_EXPLOSIONS,
  MAX_RE_ROLLS,
  DICE_MODIFIERS,

  RNK_DICE_SYMBOL,
  RNK_DIE_SIDES,

  FUDGE_DICE_NUMBER,
  FUDGE_DIE_SIDES,
  FUDGE_DICE_SYMBOLS,

  DND_DIE_SIDES,
  DND_DICE_NUM,
  DND_BOTCH,
  DND_CRITICAL,
  DND4_SYMBOL,

  YES_EMOJI,
  NO_EMOJI,
  B_EMOJI,
  M_EMOJI,
  REPEAT_EMOJI,

  THROW_SEPARATOR,
  THROW_SEPARATOR_VS,
  COMMENT_SEPARATOR,
  APPEND_COMMENT_SEPARATOR,

  VERSUS_SEPARATOR,
  VERSUS_PARTS_SEPARATOR,
  VERSUS_REPEATER,
  VERSUS_REROLLER,
  VS_CHECK_RESULTS,

  REPEAT_THROW_SEPARATOR,
  REPEAT_THROW_SEPARATOR_AOE,

  OPENING_PARENTHESIS,
  CLOSING_PARENTHESIS,

  PLUS_SIGN,
  MINUS_SIGN,

  ALLOWED_SYMBOLS,

  UNRECOGNIZED_FORMULA_REGEX,
  NUMERICAL_REGEX,

  RESULT_TYPES,
  SPECIAL_THROW_RESULTS,

  DEFAULT_THROW_RESULT_FORMAT_NAME,

  MESSAGES_DB_NAME,
  MESSAGES_COLUMNS,
  MESSAGE_TYPES,

  USE_INTERACTIVE_REACTIONS
} = require('../helpers/constants')

// Global variables
let warnings = []
let throws = []

let message = null
let botClientUser = null
let prefix = null
let commandName = null
let originalCommandText = 'EMPTY'

// -------------------------------------------------------------------------------------------------

module.exports = (args) => {
  processMessage(args)
}

const processMessage = module.exports.processMessage = (args) => {
  message = args.message
  botClientUser = args.client.user
  prefix = args.prefix
  commandName = args.commandName

  warnings = []
  throws = []

  originalCommandText = args.commandText

  try {
    if (topLevelCatcher(processWholeCommand, args.commandText)) {
      if (warnings.length) {
        topLevelCatcher(showWarnings)
      } else {
        if (topLevelCatcher(calculateWholeCommand)) {
          topLevelCatcher(showResults)
        }
      }
    }
  } catch (error) {
    logger.error(`Top level error in ${commandName} command`, error)
  }
}

module.exports.goOnFromWarning = (args) => {
  message = args.message
  botClientUser = args.client.user
  prefix = args.prefix
  commandName = args.commandName
  throws = args.throws

  warnings = []

  try {
    if (topLevelCatcher(calculateWholeCommand)) {
      topLevelCatcher(showResults)
    }
  } catch (error) {
    logger.error(`Top level error in goOnFromWarning`, error)
  }
}

module.exports.repeatRollCommand = (args) => {
  message = args.message
  botClientUser = args.client.user
  prefix = args.prefix
  commandName = args.commandName
  throws = args.throws

  removeResults()

  warnings = []

  try {
    if (topLevelCatcher(calculateWholeCommand)) {
      topLevelCatcher(showResults)
    }
  } catch (error) {
    logger.error(`Top level error in repeatRollCommand`, error)
  }
}

/* ================================================================================================
                                TECHNICAL STUFF (LIKE ERROR HANDLING)
================================================================================================ */
const clearEverything = () => {
  warnings = []
  throws = []

  message = null
  botClientUser = null
  prefix = null
  commandName = null
  originalCommandText = null
}

const addWarning = (text) => {
  const existingWarning = warnings.find(warning => warning === text)
  if (!existingWarning) {
    warnings.push(text)
  }
}

const showWarnings = async () => {
  if (warnings.length) {
    let warningsText = WARNING_PREFIX
    if (warnings.length > 1) {
      warningsText = WARNINGS_PREFIX
    }
    warnings.forEach((warning, index) => {
      if (warnings.length > 1) {
        warningsText += nws`${(index + 1).toString()}. \
                ${warning[0].toUpperCase() + warning.slice(1)}`
      } else {
        warningsText += warning
      }
      if (index < warnings.length - 1) {
        warningsText += ';\n'
      } else {
        warningsText += '.'
      }
    })
    let validCommandText
    if (USE_INTERACTIVE_REACTIONS) {
      validCommandText = getCommandText()
      if (validCommandText) {
        warningsText += '\nDo you still wish to proceed? Your command would be:'
        warningsText += '```' + validCommandText + '```'
      } else {
        warningsText += nws`\nThis will make your command empty. Please refer to \ 
        \`${prefix}help ${commandName}\` for help.`
      }
    } else {
      warningsText += `\nHere's your original command text:\`\`\`${originalCommandText}\`\`\``
    }
    const warningsMessage = await reply(warningsText, message)
    if (warningsMessage && validCommandText && USE_INTERACTIVE_REACTIONS) {
      try {
        const pairs = {}
        pairs[MESSAGES_COLUMNS.message_id] = warningsMessage.id
        pairs[MESSAGES_COLUMNS.channel_id] = message.channel.id
        pairs[MESSAGES_COLUMNS.type] = MESSAGE_TYPES.warning
        pairs[MESSAGES_COLUMNS.content] = JSON.stringify({
          messageId: message.id,
          prefix: prefix,
          commandName: commandName,
          throws: throws
        })
        pairs[MESSAGES_COLUMNS.user_id] = message.author.id
        clearEverything()
        await pg.db.none('INSERT INTO ${db#} (${pairs~}) VALUES (${pairs:list})',
          {
            db: pg.addPrefix(MESSAGES_DB_NAME),
            pairs
          })
      } catch (error) {
        logger.error(`Failed to save a warning message`, error)
        return
      }
      try {
        await Promise.all([warningsMessage.react(YES_EMOJI), warningsMessage.react(NO_EMOJI)])
      } catch (error) {
        if (error && error.name === 'DiscordAPIError') { // TODO: Figure this out
            logger.warn(`Failed to react to a warning message`, error)
        } else {
          logger.error(`Failed to react to a warning message`, error)
        }
      }
    } else {
      clearEverything()
    }
  }
}

const showError = (text) => {
  reply(nws`${ERROR_PREFIX}${text}\nHere's your original message, please copy and edit it \ 
    as needed:\n\`\`\`${message.content}\`\`\``, message)
  clearEverything()
}

const showUncaughtError = (error) => {
  if (error) {
    logger.error(`Unhandled error was thrown in roll command`, error.stack)
  } else {
    logger.error(`Unknown error was thrown in roll command`, (new Error()).stack)
  }
  reply(`${ERROR_PREFIX}Some uncaught error occurred, please contact the both author.`,
    message)
  clearEverything()
}

const topLevelCatcher = (fn, args) => {
  try {
    const result = fn(args)
    return result === undefined ? true : result
  } catch (error) {
    if (error &&
      error.name === HANDLED_ERROR_TYPE_NAME || error.name === HANDLED_WARNING_TYPE_NAME) {
      showError(error.message)
      return false
    } else {
      showUncaughtError(error)
      throw error
    }
  }
}

const catcher = (fn, args) => {
  try {
    return fn(args)
  } catch (error) {
    if (error && error.name === HANDLED_WARNING_TYPE_NAME) {
      addWarning(error.message)
      return error
    } else {
      throw(error)
    }
  }
}

// Error (will stop the parent function as well as the current one)
const e = text => {
  return { name: HANDLED_ERROR_TYPE_NAME, message: text }
}

// Warning (will NOT stop the parent function, just this one)
class Warning {
  constructor(text) {
    this.name = HANDLED_WARNING_TYPE_NAME
    this.message = text
  }
}
const w = text => {
  return new Warning(text)
}

const removeResults = () => {
  if (!throws || !throws.length) {
    return
  }

  throws.forEach((t) => {
    removeFormulaResults(t)
  })
}

const removeAnyResults = level => {
  if (level.specialResults) {
    delete level.specialResults
  }
  if (level.results) {
    delete level.results
  }
  if (level.finalResults) {
    delete level.finalResults
  }
  if (level.staticModifiersSum) {
    delete level.staticModifiersSum
  }
  if (level.vsResults) {
    delete level.vsResults
  }
  if (level.isSkipped) {
    delete level.isSkipped
  }
}

const removeFormulaResults = t => {
  removeAnyResults(t)

  if (!t.formulaParts || !t.formulaParts.length) {
    return
  }

  if (t.childThrows && t.childThrows.length) {
    t.childThrows.forEach(childThrow => {
      removeFormulaResults(childThrow)
    })
  }

  t.formulaParts.forEach(formulaPart => {
    removeAnyResults(formulaPart)
  })

  if (t.vsValues && t.vsValues.length) {
    t.vsValues.forEach((vsThrow, index) => {
      removeFormulaResults(vsThrow)
    })
  }
}
/* ================================================================================================
                                        PROCESSING STUFF
================================================================================================ */

const processWholeCommand = unprocessedCommand => {
  const isSeparator = (part) => {
    return (part === THROW_SEPARATOR || part === THROW_SEPARATOR_VS)
  }

  if (!unprocessedCommand)
    throw e(`no throw specified, try something like \`${prefix}${commandName} 2d10 + 3\``)
  const command = unprocessedCommand.trim()
  if (!command)
    throw e(`no throw specified, try something like \`${prefix}${commandName} 2d10 + 3\``)

  // First we split the command into separate throws
  const separateParts = command.split(getThrowSeparatorRegex())
  // Then we separate the comments from the formulae
  let previousPart = null
  separateParts.forEach(part => {
    if (isSeparator(part) && (!previousPart || isSeparator(previousPart))) {
      throw e(`You seem to have misplaced a \`${part}\` symbol in \`${command}\``)
    }
    if (!isSeparator(part)) {
      const result = catcher(separateCommentFromThrow, part)
      if (!(result instanceof Warning)) {
        // We also make it lowercase here
        result.formula = result.originalFormula.toLowerCase()
        if (previousPart === THROW_SEPARATOR_VS) {
          result.isConditional = true
        }
        throws.push(result)
      }
    }
    previousPart = part
  })
  // After that, we go over the now structured throws
  // First, we check their formulae for various throw sub-commands, starting with the 'versus' one
  throws.forEach((t) => {
    let result = catcher(processVsPart, t)
    if (result instanceof Warning) {
      // In case something serious was caught, let's remove the throw
      t.markedForDeletion = true
    }

    result = catcher(processRepeatThrowPart, t)
    if (result instanceof Warning) {
      // In case something serious was caught, let's remove the throw
      t.markedForDeletion = true
    }

    result = catcher(processRollFormula, t)
    if (result instanceof Warning) {
      // In case something serious was caught, let's remove the throw
      t.markedForDeletion = true
    }
  })
  throws = _.filter(throws, t => !t.markedForDeletion)

  //console.log('THROWS:\n' + JSON.stringify(throws))
}

// -------------------------------------------------------------------------------------------------

const separateCommentFromThrow = unprocessedCommand => {
  const thisThrow = {}
  if (!unprocessedCommand)
    throw w(nws`no throw specified for one or more of the throws separated by the \
        \`${THROW_SEPARATOR}\` symbol, this throw will be ignored`)
  const command = unprocessedCommand.trim()
  if (!command)
    throw w(`no throw specified for one or more of the throws separated by the \
        \`${THROW_SEPARATOR}\` symbol, this throw will be ignored`)

  let indexOfFirstCommentSeparator = command.indexOf(COMMENT_SEPARATOR)
  const indexOfFirstAppendCommentSeparator = command.indexOf(APPEND_COMMENT_SEPARATOR)
  let shouldAppendComment = false
  let symbol = COMMENT_SEPARATOR

  if (indexOfFirstAppendCommentSeparator >= 0
    && indexOfFirstAppendCommentSeparator <= indexOfFirstCommentSeparator) {
    indexOfFirstCommentSeparator = indexOfFirstAppendCommentSeparator
    shouldAppendComment = true
    symbol = APPEND_COMMENT_SEPARATOR
  }

  if (indexOfFirstCommentSeparator >= 0) {
    let formula = command.slice(0, indexOfFirstCommentSeparator).trim()
    let comment = command.slice(indexOfFirstCommentSeparator + symbol.length).trim()
    /*if (!formula) {
      throw w(nws`no roll specified for one or more of the throws before the \`${symbol}\` \
            symbol, this throw will be ignored`)
    }*/
    thisThrow.originalFormula = formula
    if (!comment) {
      addWarning(nws`There was a \`${symbol}\` symbol present in your command, but it \
            was not followed by a comment, so this empty comment will be ignored`)
    } else {
      thisThrow.comment = comment
      thisThrow.shouldAppendComment = shouldAppendComment
    }
  } else {
    thisThrow.originalFormula = command
  }

  return thisThrow
}

// -------------------------------------------------------------------------------------------------

const processVsPart = thisThrow => {
  const splitParts = thisThrow.formula.split(VERSUS_SEPARATOR)
  if (splitParts.length === 1) { // we don't have a versus separator
    return
  } else if (splitParts.length !== 2) { // Something wrong's going on here
    addWarning(nws`your throw command \`${thisThrow.originalFormula}\` seemed to have more \
        than one \`${VERSUS_SEPARATOR}\` in it, so they will all be ignored`)
    thisThrow.formula = splitParts[0].trim()
    return
  }

  // Alright, we have the correct number of parts, let's test them
  const formula = splitParts[0].trim()
  const vsPart = splitParts[1].trim()
  if (!formula) {
    throw w(nws`there is no throw command before the \`${VERSUS_SEPARATOR}\` in \
        \`${thisThrow.originalFormula}\`, so this throw will be ignored`)
  }
  if (!vsPart) {
    addWarning(nws`there is no versus value specified after the \`${VERSUS_SEPARATOR}\` in \
        \`${thisThrow.originalFormula}\`, so this check will be ignored`)
    thisThrow.formula = splitParts[0].trim()
    return
  }

  // Alright, now we're sure both parts are non-empty. Let's test the versus part for validity
  const vsValues = vsPart.split(VERSUS_PARTS_SEPARATOR)
  if (vsValues.length > MAX_REPEAT_THROWS) {
    addWarning(nws`you cannot have more than \`${MAX_REPEAT_THROWS}\` versus checks in \
        \`${thisThrow.originalFormula}\`, so all versus checks will be ignored`)
    thisThrow.formula = splitParts[0].trim()
    return
  }
  thisThrow.vsValues = []
  vsValues.forEach(vsValue => {
    let trimmedVsValue = vsValue.trim()
    if (!trimmedVsValue) {
      addWarning(nws`one of the versus values after the \`${VERSUS_SEPARATOR} in \
            \`${thisThrow.originalFormula}\` was empty, so it will be ignored`)
    } else {
      let shouldRepeat = false
      let shouldReRoll = false
      if (trimmedVsValue.endsWith(VERSUS_REPEATER)) {
        shouldRepeat = true
        trimmedVsValue = trimmedVsValue.replace(VERSUS_REPEATER, '')
      } else if (trimmedVsValue.endsWith(VERSUS_REROLLER)) {
        shouldReRoll = true
        trimmedVsValue = trimmedVsValue.replace(VERSUS_REROLLER, '')
      }
      const vsValueObject = {
        originalFormula: trimmedVsValue,
        formula: trimmedVsValue,
        shouldRepeat,
        shouldReRoll
      }
      const result = catcher(processRollFormula, vsValueObject)
      if (!(result instanceof Warning)) {
        thisThrow.vsValues.push(vsValueObject)
      }
    }
  })

  thisThrow.formula = formula
}

// -------------------------------------------------------------------------------------------------

const processRepeatThrowPart = thisThrow => {
  const repeatThrowParts = thisThrow.formula.match(getRepeatThrowRegex())
  let requestedRepeatNumber = 1
  const vsRepeatNumber = thisThrow.vsValues ? thisThrow.vsValues.length : 1
  if (repeatThrowParts && repeatThrowParts.length) {
    if (repeatThrowParts.length > 1) {
      addWarning(nws`your throw command \`${thisThrow.originalFormula}\` seemed to have more \
        than one repeat throw separator (\`${REPEAT_THROW_SEPARATOR}\` or \
        \`${REPEAT_THROW_SEPARATOR_AOE}\`) in it, so they will all be ignored`)
      thisThrow.formula = thisThrow.formula.replace(getRepeatThrowRegex(), '')
      return
    }

    thisThrow.formula = thisThrow.formula.replace(getRepeatThrowRegex(), '')

    requestedRepeatNumber =
      Number(repeatThrowParts[0].replace(getRepeatThrowSeparatorRegex(), '').trim())

    if (requestedRepeatNumber > MAX_REPEAT_THROWS) {
      addWarning(nws`you cannot have more than \`${MAX_REPEAT_THROWS}\` repeated throws in \
        \`${thisThrow.originalFormula}\`, so this will be ignored`)
      return
    }
    if (requestedRepeatNumber < 2) {
      addWarning(nws`you requested to repeat your throw in \
        \`${thisThrow.originalFormula}\` less than once, so this request will be ignored`)
      return
    }
  }

  const finalRepeatNumber = Math.max(vsRepeatNumber, requestedRepeatNumber)
  if (finalRepeatNumber >= 2) {
    thisThrow.repeatNumber = finalRepeatNumber
  }
}

// -------------------------------------------------------------------------------------------------

const processRollFormula = thisThrow => {
  let level = 0
  let maxLevel = 0

  const processParenthesesForThrowPart = args => {
    const { throwPart, parent } = args
    if (maxLevel >= MAX_PARENTHESES_LEVEL) {
      throw w(nws`Your throw \`${thisThrow.originalFormula}\` has parentheses that go too deep, \
        maximum allowed level is ${MAX_PARENTHESES_LEVEL}, so this throw will be ignored`)
    }
    if (!throwPart.childThrows) {
      throwPart.childThrows = []
    }
    // First, we process the parentheses
    // Let's get some very basic checks out of the way
    const openingParenthesesCount = _.filter(throwPart.formula,
      s => s === OPENING_PARENTHESIS
    ).length
    const closingParenthesesCount = _.filter(throwPart.formula,
      s => s === CLOSING_PARENTHESIS
    ).length

    if (openingParenthesesCount === 0) { // we have no parentheses, whew!
      return
    }

    if (openingParenthesesCount !== closingParenthesesCount) {
      throw w(nws`the number of \`${OPENING_PARENTHESIS}\` symbols does not match the \
            number of \`${CLOSING_PARENTHESIS}\` symbols in \`${throwPart.originalFormula}\`, so \
            this throw will be ignored`)
    }

    const firstOpeningParenthesisIndex = throwPart.formula.indexOf(OPENING_PARENTHESIS)
    const firstClosingParenthesisIndex = throwPart.formula.indexOf(CLOSING_PARENTHESIS)

    if(firstOpeningParenthesisIndex > firstClosingParenthesisIndex) {
      throw w(nws`the first \`${OPENING_PARENTHESIS}\` symbol appears before the first \
            \`${CLOSING_PARENTHESIS}\` symbol in \`${throwPart.originalFormula}\`, so this throw \
            will be ignored`)
    }

    let newFormula = throwPart.formula.slice(0, firstOpeningParenthesisIndex)
    let restOfTheFormula = throwPart.formula.slice(
      firstOpeningParenthesisIndex + OPENING_PARENTHESIS.length
    )
    let insidePart = ''
    let closingParenthesisIndex = -1

    _.every(restOfTheFormula, (symbol, index) => {
      if (symbol === OPENING_PARENTHESIS) {
        level++
        maxLevel = Math.max(level, maxLevel)
        insidePart += symbol
      } else if (symbol === CLOSING_PARENTHESIS) {
        if (level === 0) {
          closingParenthesisIndex = index
          return false
        } else {
          level--
          insidePart += symbol
        }
      } else {
        insidePart += symbol
      }
      return true
    })
    restOfTheFormula = restOfTheFormula.slice(
      closingParenthesisIndex + CLOSING_PARENTHESIS.length
    )

    insidePart = insidePart.trim()
    if (insidePart) {
      let index = throwPart.childThrows.length

      newFormula = nws`${newFormula}${OPENING_PARENTHESES_REPLACER}${index}${CLOSING_PARENTHESES_REPLACER}${restOfTheFormula}`
      newFormula = newFormula.trim()
      throwPart.formula = newFormula

      const childThrow = {
        originalFormula: insidePart,
        formula: insidePart
      }
      throwPart.childThrows.push(childThrow)

      const result = catcher(processParenthesesForThrowPart, {
        throwPart: childThrow, parent: throwPart
      })
      if (result) throw result
    } else {
      addWarning(nws`Your throw \`${thisThrow.originalFormula}\` appears to have at least \
            one empty set of parentheses, they will be ignored`)
      throwPart.formula = `${newFormula}${restOfTheFormula}`.trim()
    }

    // And then we repeat this to make sure we got all the parentheses on this level
    const result = catcher(processParenthesesForThrowPart, { throwPart, parent })
    if (result) throw result
  }

  const processRollStructureElement = throwPart => {
    if (throwPart.childThrows.length) {
      throwPart.childThrows.forEach(childThrow => {
        childThrow.repeatNumber = throwPart.repeatNumber
        processRollStructureElement(childThrow)
      })
    }
    processRollPart(throwPart)
  }

  // First, we need to check for symbols that are not allowed
  const disallowedSymbols = thisThrow.formula.match(getDisallowedSymbolsRegex())
  if (disallowedSymbols && disallowedSymbols.length) {
    addWarning(nws`there were unrecognized symbols such as \`${disallowedSymbols[0]}\` found \
        in \`${thisThrow.originalFormula}\`, so they will be ignored. Perhaps you forgot to place \
        a \`${COMMENT_SEPARATOR}\` symbol before writing a comment`)
    thisThrow.formula = thisThrow.formula.replace(getDisallowedSymbolsRegex(), '')
  }

  // Now, we need to go over all the opening parentheses and find the matching closing ones
  // on the same "level". Whatever is inside these parentheses will be moved to this throw's
  // children throws
  const result = catcher(processParenthesesForThrowPart, { throwPart: thisThrow })
  if (result) throw result
  // Just in case, let's see if there still is any formula left
  /*if (!thisThrow.formula) {
    throw w(nws`Your throw \`${thisThrow.originalFormula}\` appears to be empty, so it will \
        be ignored`)
  }*/
  processRollStructureElement(thisThrow)
}

// -------------------------------------------------------------------------------------------------

const processRollPart = thisThrow => {
  const tryToProcessOperand = () => {
    currentOperand = currentOperand.trim()
    if (!currentOperand.length) {
      return
    }

    if (thisThrow.formulaParts.length
      && _.contains(
        _.values(FORMULA_PART_TYPES.operands),
        thisThrow.formulaParts[thisThrow.formulaParts.length - 1].type
      )
    ) {
      // If the previous part is not an operator, this being an operand doesn't make a whole
      // lot of sense. Perhaps it's a typo or a comment sign was forgotten?
      addWarning(nws`\`${currentOperand}\` is not recognized as a valid throw formula in \
            \`${thisThrow.originalFormula}\`, so it will be ignored. ${getTypoOrCommentHint()}`)
      return
    }

    const unrecognizedSymbols = currentOperand.match(
      new RegExp(UNRECOGNIZED_FORMULA_REGEX, 'gm')
    )
    if (unrecognizedSymbols && unrecognizedSymbols.length) {
      addWarning(nws`there were unrecognized symbols such as \
            \`${unrecognizedSymbols[0]}\` found in \`${thisThrow.originalFormula}\`, so they will \
            be ignored`)
      currentOperand = currentOperand.replace(
        new RegExp(UNRECOGNIZED_FORMULA_REGEX, 'gm'),
        ''
      )
    }

    if (currentOperand.match(new RegExp(NUMERICAL_REGEX, 'g'))) {
      // this is probably a number
      const number = Number(currentOperand)

      if (isNaN(number)) {
        addWarning(nws`could not convert \`${currentOperand}\` to number in \
                \`${thisThrow.originalFormula}\`, so it will be ignored`)
      } else {
        thisThrow.formulaParts.push({
          type: FORMULA_PART_TYPES.operands.number,
          value: number
        })
      }
    } else if (currentOperand.match(getChildThrowRegex())) {
      // this is probably a child throw
      const number = Number(currentOperand.slice(1, currentOperand.length - 1))
      if (isNaN(number)) {
        addWarning(nws`could not convert \`${currentOperand}\` to number in \
                \`${thisThrow.originalFormula}\`, so it will be ignored`)
      } else {
        thisThrow.formulaParts.push({
          type: FORMULA_PART_TYPES.operands.child,
          index: number
        })
      }
    }
    else {
      const result = catcher(processDiceOperand, currentOperand)
      if (!(result instanceof Warning)) {
        thisThrow.formulaParts.push(result)
      }
    }

    currentOperand = ''
  }

  // We replace the white space characters here with just space, but still have the
  // thisThrow.originalFormula
  const formulaSymbols = [...thisThrow.formula.replace(/\s+/g, ' ')]

  thisThrow.formulaParts = []

  let currentOperand = ''

  formulaSymbols.forEach((symbol) => {
    switch(symbol) {
      case PLUS_SIGN: {
        tryToProcessOperand()
        if (!thisThrow.formulaParts.length
          || _.contains(
            _.values(FORMULA_PART_TYPES.operators),
            thisThrow.formulaParts[thisThrow.formulaParts.length - 1].type
          )
        ) {
          // If this is the very first formula part, or if the previous part is not
          // an operand, this plus sign doesn't make a whole lot of sense
          addWarning(nws`a \`${PLUS_SIGN}\` symbol might have been misplaced in \
                    \`${thisThrow.originalFormula}\`, so it will be ignored`)
        } else {
          thisThrow.formulaParts.push({ type: FORMULA_PART_TYPES.operators.sum })
        }
        break
      }
      case MINUS_SIGN: {
        tryToProcessOperand()
        // Unlike the plus sign, the minus sign can be placed pretty much anywhere.
        // We will resolve multiple uses of it later, for now we just need to record
        // all of its placements.
        thisThrow.formulaParts.push({ type: FORMULA_PART_TYPES.operators.subtract })
        break
      }
      /*case ' ': {
          tryToProcessOperand()
          break
      }*/
      default: {
        currentOperand += symbol
      }
    }
  })

  tryToProcessOperand()
}

// -------------------------------------------------------------------------------------------------

const processDiceOperand = (unparsedFormula) => {
  const formula = unparsedFormula.toLowerCase()

  // let's determine what dice we're looking at and process them accordingly
  if (formula.match(getNormalDiceRegex())) {
    // this is presumably a normal dice
    return catcher(processRegularDice, unparsedFormula)
  } else if (formula.match(getRnKDiceRegex())) {
    return catcher(processRnKDice, unparsedFormula)
  } else if (formula.startsWith(DND4_SYMBOL)) {
    return catcher(processDnD4Dice, unparsedFormula)
  } else {
    let startingFudgeDiceSymbol = ''
    FUDGE_DICE_SYMBOLS.forEach(fudgeDiceSymbol => {
      if (formula.startsWith(fudgeDiceSymbol)) {
        startingFudgeDiceSymbol = fudgeDiceSymbol
      }
    })
    if (startingFudgeDiceSymbol) {
      return catcher(processFudgeDice, { unparsedFormula, startingFudgeDiceSymbol })
    }
  }
  throw w(nws`\`${unparsedFormula}\` was not recognized as a valid dice formula, so it will \
    be ignored. ${getTypoOrCommentHint()}`)
}

// -------------------------------------------------------------------------------------------------

const processDnD4Dice = (unparsedFormula) => {
  const dice = {
    formula: unparsedFormula,
    type: FORMULA_PART_TYPES.operands.dnd4Dice,
    number: DND_DICE_NUM,
    sides: DND_DIE_SIDES,
    diceMods: [{
      type: DICE_MODIFIERS.critical,
      value: DND_CRITICAL,
      default: true
    }, {
      type: DICE_MODIFIERS.botch,
      value: DND_BOTCH,
      default: true
    }]
  }

  let parsedFormula = unparsedFormula.slice(DND4_SYMBOL.length)

  processDiceModifiers(dice, parsedFormula, unparsedFormula)

  return dice
}

// -------------------------------------------------------------------------------------------------

const processFudgeDice = (args) => {
  const { unparsedFormula, startingFudgeDiceSymbol } = args
  const dice = {
    formula: unparsedFormula,
    type: FORMULA_PART_TYPES.operands.fudgeDice,
    number: FUDGE_DICE_NUMBER,
    sides: FUDGE_DIE_SIDES,
    diceMods: []
  }

  // For now, we do not allow any dice mods for FUDGE dice, but if we were to, that's the place
  const remainingSymbols = unparsedFormula.slice(startingFudgeDiceSymbol.length)
  if (remainingSymbols.length) {
    throw w(nws`\`${remainingSymbols}\` is not recognized in \
            \`${unparsedFormula}\`, so it will be ignored. ${getTypoOrCommentHint()}`)
  }

  return dice
}

// -------------------------------------------------------------------------------------------------

const processRnKDice = (unparsedFormula) => {
  const dice = {
    formula: unparsedFormula,
    type: FORMULA_PART_TYPES.operands.rnkDice,
    number: 1,
    sides: RNK_DIE_SIDES,
    diceMods: [{
      type: DICE_MODIFIERS.explode,
      value: RNK_DIE_SIDES,
      default: true
    }]
  }

  let parsedFormula = unparsedFormula

  let result = catcher(getDiceNumber, { unparsedFormula, parsedFormula, word: 'roll' })
  if (result) {
    if (result instanceof Warning) {
      return result
    }
    dice.number = result
    parsedFormula = parsedFormula.slice(dice.number.toString().length)
  }

  parsedFormula = parsedFormula.slice(RNK_DICE_SYMBOL.length)

  const keepNumber = catcher(getDiceNumber, { unparsedFormula, parsedFormula, word: 'keep' })
  if (keepNumber instanceof Warning) {
    return result
  }
  if (!keepNumber) {
    throw w(nws`You have to keep at least 1 die in \
            \`${unparsedFormula}\`, so this roll will be ignored. ${getTypoOrCommentHint()}`)
  }

  if (keepNumber > dice.number) {
    throw w(nws`You cannot keep more dice (${keepNumber}) than you roll (${dice.number}) in \
            \`${unparsedFormula}\`, so this roll will be ignored. ${getTypoOrCommentHint()}`)
  }

  dice.diceMods.push({
    type: DICE_MODIFIERS.keepHighest,
    value: keepNumber
  })

  parsedFormula = parsedFormula.slice(keepNumber.toString().length)
  processDiceModifiers(dice, parsedFormula, unparsedFormula)

  return dice
}

// -------------------------------------------------------------------------------------------------

const processRegularDice = (unparsedFormula) => {
  const dice = {
    formula: unparsedFormula,
    type: FORMULA_PART_TYPES.operands.normalDice,
    number: 1,
    diceMods: []
  }

  let parsedFormula = unparsedFormula

  let result = catcher(getDiceNumber, { unparsedFormula, parsedFormula, word: 'roll' })
  if (result) {
    if (result instanceof Warning) {
      return result
    }
    dice.number = result
    parsedFormula = parsedFormula.slice(dice.number.toString().length)
  }

  parsedFormula = parsedFormula.slice(NORMAL_DICE_SYMBOL.length)

  result = catcher(getDieSides, { unparsedFormula, parsedFormula })
  if (result instanceof Warning) {
    return result
  }
  dice.sides = result

  parsedFormula = parsedFormula.slice(dice.sides.toString().length)
  processDiceModifiers(dice, parsedFormula, unparsedFormula)

  return dice
}

// -------------------------------------------------------------------------------------------------

const getDiceNumber = (args) => {
  let { unparsedFormula, parsedFormula, word } = args
  let diceNumber = parsedFormula.match(/^\d+/g)

  if (diceNumber && diceNumber.length) {
    diceNumber = Number(diceNumber[0])
    if (isNaN(diceNumber)) {
      throw w(nws`\`${diceNumber}\` is not a valid number of dice ${word}s in \
            \`${unparsedFormula}\`, so it will be ignored. ${getTypoOrCommentHint()}`)
    }

    if (diceNumber < 1) {
      throw w(nws`it seems that you have attempted to ${word} less than one die in \
            \`${unparsedFormula}\`, so this roll will be ignored`)
    }

    if (diceNumber > MAX_DICE_NUMBER) {
      throw w(nws`it seems that you have attempted to ${word} more than ${MAX_DICE_NUMBER} dice \
            in \`${unparsedFormula}\`, so these dice will be ignored`)
    }
  } else return null

  return diceNumber
}

const getDieSides = (args) => {
  let { unparsedFormula, parsedFormula } = args
  let dieSides = parsedFormula.toString().match(/^\d+/g)
  if (dieSides && dieSides.length) {
    dieSides = Number(dieSides[0])
    if (isNaN(dieSides)) {
      throw w(nws`\`${dieSides}\` is not a valid number of die sides in \
            \`${unparsedFormula}\`, so it will be ignored. ${getTypoOrCommentHint()}`)
    }

    if (dieSides < 1) {
      throw w(nws`it seems that you have attempted to roll a die with less than one side in \
            \`${unparsedFormula}\`, so this roll will be ignored`)
    }

    if (dieSides > MAX_DIE_SIDES) {
      throw w(nws`it seems that you have attempted to roll more a die with more than \
            ${MAX_DICE_NUMBER} sides in \`${unparsedFormula}\`, so it will be ignored`)
    }
  } else {
    throw w(nws`the number of die sides was not specified in \`${unparsedFormula}\`, so \
        this roll will be ignored`)
  }

  return dieSides || 1
}

// -------------------------------------------------------------------------------------------------

const processDiceModifiers = (dice, parsedFormula, unparsedFormula) => {
  const diceMods = parsedFormula.toString().match(getDiceModifierRegex())
  if (diceMods && diceMods.length) {
    diceMods.forEach(diceMod => {
      const result = catcher(processDiceModifier, {diceMod, dice})
      if (result && !(result instanceof Warning)) {
        if (result.toBeDeleted) {
          dice.diceMods = dice.diceMods.filter(dm => dm.type !== result.type)
        } else {
          dice.diceMods.push(result)
        }
      }
    })

    parsedFormula = parsedFormula.toString().replace(getDiceModifierRegex(), '').trim()
  }
  if (parsedFormula.length) {
    addWarning(nws`\`${parsedFormula}\` was not recognized as valid syntax in \
        \`${unparsedFormula}\`, so it will be ignored. ${getTypoOrCommentHint()}`)
  }
}

// -------------------------------------------------------------------------------------------------

const processDiceModifier = (args) => {
  const { diceMod, dice } = args

  const modName = diceMod.match(/^[a-z]+/gi)[0].toLowerCase()
  const modValue = Number(diceMod.match(/\d+$/g)[0])
  if (isNaN(modValue)) {
    throw w(nws`\`${modValue}\` is not a valid number for a \`${modName}\` roll modifier in \
            \`${dice.formula}\`, so it will be ignored. ${getTypoOrCommentHint()}`)
  }
  switch (modName) {
    case DICE_MODIFIERS.countEqual:
    case DICE_MODIFIERS.countOver:
    case DICE_MODIFIERS.countUnder: {
      const otherCountMods = dice.diceMods.filter(mod =>
        mod.type === DICE_MODIFIERS.countEqual
        || mod.type === DICE_MODIFIERS.countOver
        || mod.type === DICE_MODIFIERS.countUnder
      )
      if (otherCountMods && otherCountMods.length) {
        throw w(nws`there appear to be several count checks in \
                \`${dice.formula}\`, so only the first one will be applied to it`)
      }
      if (modValue < 1) {
        throw w(nws`can't compare a die roll result to ${modValue}, the minimum value is \
                1, this check will be ignored`)
      }
      if (modValue > dice.sides) {
        throw w(nws`can't compare a ${dice.sides}-sided die roll result to ${modValue}, \
                it is too high, this check will be ignored`)
      }
      if (modName === DICE_MODIFIERS.countUnder && modValue === 1) {
        throw w(nws`no dice roll result for a roll of \
                ${dice.number}${NORMAL_DICE_SYMBOL}${dice.sides}${modName}${modValue} will be \
                under 1, since 1 is the lowest possible result, so this check will be ignored`)
      }
      if (modName === DICE_MODIFIERS.countUnder && modValue === dice.sides) {
        throw w(nws`all dice roll results for a roll of \
                ${dice.number}${NORMAL_DICE_SYMBOL}${dice.sides}${modName}${modValue} will be over \
                ${modValue}, since each die only has ${dice.sides} sides. This check will be \
                ignored`)
      }
      if (modName === DICE_MODIFIERS.countOver && modValue === 1) {
        throw w(nws`all dice roll results for a roll of \
                ${dice.number}${NORMAL_DICE_SYMBOL}${dice.sides}${modName}${modValue} will be \
                over 1, since 1 is the lowest possible result, so this check will be ignored`)
      }
      if (modName === DICE_MODIFIERS.countOver && modValue >= dice.sides) {
        throw w(nws`no dice roll result for a roll of \
                ${dice.number}${NORMAL_DICE_SYMBOL}${dice.sides}${modName}${modValue} will be \
                over ${modValue}, since each die only has ${dice.sides} sides. This check will be \
                ignored`)
      }
      return { type: modName, value: modValue }
    }
    case DICE_MODIFIERS.keepHighest:
    case DICE_MODIFIERS.keepLowest: {
      const otherKeepMods = dice.diceMods.filter(mod =>
        mod.type === DICE_MODIFIERS.keepHighest
        || mod.type === DICE_MODIFIERS.keepLowest
      )
      if (otherKeepMods && otherKeepMods.length) {
        throw w(nws`there appear to be several keep checks in \
                \`${dice.formula}\`, so only the first one will be applied to it`)
      }
      if (modValue < 1) {
        throw w(nws`can't keep ${modValue} dice roll results, the minimum amount is 1, \
                this check will be ignored`)
      }
      if (modValue > dice.number) {
        throw w(nws`can't keep ${modValue} dice roll results of a ${dice.number}\
                ${NORMAL_DICE_SYMBOL}${dice.sides} throw, the number is too high, this check will \
                be ignored`)
      }
      if (modValue === dice.number) {
        throw w(nws`all dice will be kept if you would try to keep ${modValue} dice roll \ 
                results of a ${dice.number}${NORMAL_DICE_SYMBOL}${dice.sides} throw, this check \
                will be ignored`)
      }
      return { type: modName, value: modValue }
    }
    case DICE_MODIFIERS.explode: {
      const otherExplodeMods = dice.diceMods.filter(mod =>
        mod.type === DICE_MODIFIERS.explode
      )
      let replaceDefault = false
      if (otherExplodeMods && otherExplodeMods.length) {
        if (otherExplodeMods.length === 1 && otherExplodeMods[0].default) {
          replaceDefault = true
        } else {
          throw w(nws`there appear to be several explode modifiers in \
                \`${dice.formula}\`, so only the first one will be applied to it`)
        }
      }
      if (modValue < 2) {
        if (modValue !== 0 && !replaceDefault) {
          throw w(nws`can't explode on a ${modValue}, the minimum explosion value is 2, \
                this modifier will be ignored`)
        }
      }
      if (modValue > dice.sides) {
        throw w(nws`can't explode on a ${modValue} for a roll of a ${dice.sides}-sided \
                die, this modifier will be ignored`)
      }

      if (replaceDefault) {
        if (modValue === 0) { // This will remove the default rules if they exist
          return { type: modName, toBeDeleted: true }
        } else {
          otherExplodeMods[0].value = modValue
          delete otherExplodeMods[0].default
        }
        return null
      }

      return { type: modName, value: modValue }
    }
    case DICE_MODIFIERS.reRollTimes:
    case DICE_MODIFIERS.explodeTimes: {
      let action = ''
      let max = 0
      let otherMods = []
      if (modName === DICE_MODIFIERS.explodeTimes) {
        otherMods = dice.diceMods.filter(mod =>
          mod.type === DICE_MODIFIERS.explodeTimes
        )
        action = 'explode'
        max = MAX_EXPLOSIONS
      } else {
        otherMods = dice.diceMods.filter(mod =>
          mod.type === DICE_MODIFIERS.reRollTimes
        )
        action = 're-roll'
        max = MAX_RE_ROLLS
      }
      if (otherMods && otherMods.length) {
        throw w(nws`there appear to be several ${action} count modifiers in \
                \`${dice.formula}\`, so only the first one will be applied to it`)
      }
      if (modValue < 1) {
        throw w(nws`can't ${action} less than once, the \`${DICE_MODIFIERS.explodeTimes}\` \ 
                modifier will be ignored for the \`${dice.formula}\` throw`)
      }
      if (modValue > max) {
        throw w(nws`can't ${action} more than ${max} times, the \`${modName}\` modifier \
                will be ignored for the \`${dice.formula}\` throw`)
      }
      return { type: modName, value: modValue }
    }
    case DICE_MODIFIERS.reRollIfTotalOver:
    case DICE_MODIFIERS.reRollIfTotalUnder:
    case DICE_MODIFIERS.reRollIfTotalEquals:
    case DICE_MODIFIERS.reRollIfEquals:
    case DICE_MODIFIERS.brutal:
    case DICE_MODIFIERS.reRollIfUnder:
    case DICE_MODIFIERS.reRollIfOver: {
      let otherReRollMods = []
      let action = ''
      let mod = modName
      let min = 0
      let max = 0
      let value = modValue
      if (dice.number === 1) { // functionally, "re-roll if total" is same as "re-roll" then
        if (modName === DICE_MODIFIERS.reRollIfTotalEquals) {
          mod = DICE_MODIFIERS.reRollIfEquals
        }
        if (modName === DICE_MODIFIERS.reRollIfTotalUnder) {
          mod = DICE_MODIFIERS.reRollIfUnder
        }
        if (modName === DICE_MODIFIERS.reRollIfTotalOver) {
          mod = DICE_MODIFIERS.reRollIfOver
        }
      }
      if (mod === DICE_MODIFIERS.reRollIfOver) {
        otherReRollMods = dice.diceMods.filter(m =>
          m.type === DICE_MODIFIERS.reRollIfOver
        )
        action = 'over'
        min = 1
        max = dice.sides - 1
      } else if (mod === DICE_MODIFIERS.reRollIfUnder) {
        otherReRollMods = dice.diceMods.filter(m =>
          m.type === DICE_MODIFIERS.reRollIfUnder
        )
        action = 'under'
        mod = DICE_MODIFIERS.reRollIfUnder
        min = 2
        max = dice.sides
      } else if (mod === DICE_MODIFIERS.brutal) { // value is off by one
        otherReRollMods = dice.diceMods.filter(m =>
          m.type === DICE_MODIFIERS.reRollIfUnder
        )
        action = 'under'
        mod = DICE_MODIFIERS.reRollIfUnder
        min = 2
        max = dice.sides
        value = modValue + 1
      } else if (mod === DICE_MODIFIERS.reRollIfEquals) {
        otherReRollMods = dice.diceMods.filter(m =>
          m.type === DICE_MODIFIERS.reRollIfEquals
        )
        action = 'equals'
        min = 1
        max = dice.sides
      } else if (mod === DICE_MODIFIERS.reRollIfTotalOver) {
        otherReRollMods = dice.diceMods.filter(m =>
          m.type === DICE_MODIFIERS.reRollIfTotalOver
        )
        action = 'total is over'
        min = dice.number
        max = dice.sides * dice.number - 1
      }
      else if (mod === DICE_MODIFIERS.reRollIfTotalUnder) {
        otherReRollMods = dice.diceMods.filter(m =>
          m.type === DICE_MODIFIERS.reRollIfTotalUnder
        )
        action = 'total is under'
        min = dice.number + 1
        max = dice.sides * dice.number
      }
      else if (mod === DICE_MODIFIERS.reRollIfTotalEquals) {
        otherReRollMods = dice.diceMods.filter(m =>
          m.type === DICE_MODIFIERS.reRollIfTotalEquals
        )
        action = 'total equals'
        min = dice.number
        max = dice.sides * dice.number
      }
      if (otherReRollMods && otherReRollMods.length) {
        throw w(nws`there appear to be several "re-roll if ${action}" roll modifiers in \
                \`${dice.formula}\`, so only the first one will be applied to it`)
      }
      if (value < min) {
        throw w(nws`can't re-roll a die roll if ${action} ${value}, the minimum value \
                is ${min}, this roll modifier will be ignored`)
      }
      if (value > max) {
        throw w(nws`can't re-roll if the result of a throw ${action} ${value}, the \ 
                maximum value is ${max}, so this roll modifier will be ignored`)
      }
      return { type: mod, value }
    }
    case DICE_MODIFIERS.critical: {
      let replaceDefault = false
      const otherCriticalMods = dice.diceMods.filter(mod =>
        mod.type === DICE_MODIFIERS.critical
      )
      if (otherCriticalMods && otherCriticalMods.length) {
        if (otherCriticalMods.length === 1 && otherCriticalMods[0].default) {
          replaceDefault = true
        } else {
          throw w(nws`there appear to be several "critical" roll modifiers in \
                \`${dice.formula}\`, so only the first one will be applied to it`)
        }
      }
      if (modValue <= 1) {
        if (modValue !== 0 && !replaceDefault) {
          throw w(nws`can't set a critical value to ${modValue}, the minimum value is \
                2, this roll modifier will be ignored`)
        }
      }
      if (modValue > dice.sides) {
        throw w(nws`can't set a critical value to ${modValue} in a \`${dice.formula}\` \
                roll, so this roll modifier will be ignored`)
      }
      if (replaceDefault) {
        if (modValue === 0) { // This will remove the default rules if they exist
          return { type: modName, toBeDeleted: true }
        } else {
          otherCriticalMods[0].value = modValue
          delete otherCriticalMods[0].default
        }
        return null
      }
      return { type: modName, value: modValue }
    }
    case DICE_MODIFIERS.botch: {
      let replaceDefault = false
      const otherBotchMods = dice.diceMods.filter(mod =>
        mod.type === DICE_MODIFIERS.botch
      )
      if (otherBotchMods && otherBotchMods.length) {
        if (otherBotchMods.length === 1 && otherBotchMods[0].default) {
          replaceDefault = true
        } else {
          throw w(nws`there appear to be several "botch" roll modifiers in \
                \`${dice.formula}\`, so only the first one will be applied to it`)
        }
      }
      if (modValue < 1) {
        if (modValue !== 0 && !replaceDefault) {
          throw w(nws`can't set a botch value to ${modValue}, the minimum value is \
                1, this roll modifier will be ignored`)
        }
      }
      if (modValue >= dice.sides) {
        throw w(nws`can't set a botch value to ${modValue} in a \`${dice.formula}\` \
                roll, so this roll modifier will be ignored`)
      }
      if (replaceDefault) {
        if (modValue === 0) { // This will remove the default rules if they exist
          return { type: modName, toBeDeleted: true }
        } else {
          otherBotchMods[0].value = modValue
          delete otherBotchMods[0].default
        }
        return null
      }
      return { type: modName, value: modValue }
    }
    default: {
      throw w(nws`\`${modName}\` in \`${dice.formula}\` is not a recognized roll modifier, \
            so it will be ignored. ${getTypoOrCommentHint()}`)
    }
  }
}

/* ================================================================================================
                                        ROLLING STUFF
================================================================================================ */

const calculateWholeCommand = () => {
  let previousThrow = null

  throws.forEach(t => {
    let rollForResults = true
    if (t.isConditional && previousThrow) {
      if (previousThrow.isSkipped) {
        rollForResults = false
      } else if (previousThrow.vsResults && previousThrow.vsResults.length) {
        // TODO: For now we use ANY success from a throw with repeats. Maybe have some other way?
        const i = previousThrow.vsResults.findIndex(vsResult =>
          vsResult === VS_CHECK_RESULTS.success || vsResult === VS_CHECK_RESULTS.criticalDnD4
        )
        if (i === -1) {
          rollForResults = false
        }
      }
    }
    if (rollForResults) {
      if (t.vsValues && t.vsValues.length) {
        t.vsValues.forEach(vsThrow => {
          catcher(calculateThrow, vsThrow)
        })

        // Rolling/copying for our additional, omitted versus checks
        if (t.repeatNumber && t.vsValues.length < t.repeatNumber) {
          const lastVsValue = t.vsValues[t.vsValues.length - 1]
          const difference = t.repeatNumber - t.vsValues.length
          if (lastVsValue.shouldRepeat) {
            for (let i = 0; i < difference; i++) {
              t.vsValues.push(JSON.parse(JSON.stringify(lastVsValue)))
            }
          } else if (lastVsValue.shouldReRoll) {
            for (let i = 0; i < difference; i++) {
              const copiedVsValue = JSON.parse(JSON.stringify(lastVsValue))
              copiedVsValue.shouldReRoll = false
              copiedVsValue.shouldRepeat = false
              removeAnyResults(copiedVsValue)
              copiedVsValue.formulaParts.forEach(formulaPart => {
                removeAnyResults(formulaPart)
              })
              catcher(calculateThrow, copiedVsValue)
              t.vsValues.push(copiedVsValue)
            }
          }
        }
      }
      catcher(calculateThrow, t)
    } else {
      t.isSkipped = true
    }
    previousThrow = t
  })

  //console.log(`RESULTS:\n${JSON.stringify(throws)}`)
}

// -------------------------------------------------------------------------------------------------

const calculateThrow = (thisThrow) => {
  let finalResult = 0
  let staticModifiersSum = 0
  let operation = FORMULA_PART_TYPES.operators.sum

  const resetInitialValues = () => {
    finalResult = 0
    staticModifiersSum = 0
    operation = FORMULA_PART_TYPES.operators.sum
  }
  resetInitialValues()

  const sumOrSubtract = (value, isStatic) => {
    if (operation === FORMULA_PART_TYPES.operators.sum) {
      finalResult += value
      if (isStatic) staticModifiersSum += value
    } else {
      finalResult -= value
      if (isStatic) staticModifiersSum -= value
    }
    operation = FORMULA_PART_TYPES.operators.sum
  }

  const addSpecialResults = (specialResults) => {
    if (!thisThrow.specialResults) thisThrow.specialResults = []
    thisThrow.specialResults.push(specialResults)
  }

  // Don't forget to go through all the child throws!
  thisThrow.childThrows.forEach(childThrow => {
    catcher(calculateThrow, childThrow)
  })

  // First we need to calculate all actual random elements before we can use their results in
  // the calculating the whole formula
  const repeatNumber = thisThrow.repeatNumber ? thisThrow.repeatNumber : 1
  for (let i = 0; i < repeatNumber; i++) {
    resetInitialValues()

    thisThrow.formulaParts.forEach(formulaPart => {
      switch (formulaPart.type) {
        case FORMULA_PART_TYPES.operands.normalDice:
        case FORMULA_PART_TYPES.operands.dnd4Dice:
        case FORMULA_PART_TYPES.operands.rnkDice: {
          catcher(calculateNormalDice, formulaPart)
          sumOrSubtract(formulaPart.finalResults[i])
          if (formulaPart.specialResults && formulaPart.specialResults.length) {
            addSpecialResults(formulaPart.specialResults[i])
          }
          break
        }
        case FORMULA_PART_TYPES.operands.fudgeDice: {
          catcher(calculateNormalDice, formulaPart)
          sumOrSubtract(formulaPart.finalResults[i])
          break
        }
        case FORMULA_PART_TYPES.operands.number: {
          sumOrSubtract(formulaPart.value, true)
          break
        }
        case FORMULA_PART_TYPES.operands.child: {
          sumOrSubtract(thisThrow.childThrows[formulaPart.index].finalResults[i])
          break
        }
        case FORMULA_PART_TYPES.operators.subtract: {
          if (operation === FORMULA_PART_TYPES.operators.subtract) {
            operation = FORMULA_PART_TYPES.operators.sum
          } else {
            operation = FORMULA_PART_TYPES.operators.subtract
          }
          break
        }
        default: { /* We don't need to do anything here */
        }
      }
    })

    if (!thisThrow.finalResults) {
      thisThrow.finalResults = []
    }
    thisThrow.finalResults.push(finalResult)
    thisThrow.staticModifiersSum = staticModifiersSum

    // Check for versus results
    if (thisThrow.vsValues && thisThrow.vsValues.length) {
      const indexOfRepeat = thisThrow.finalResults.length - 1
      const vsThrow = thisThrow.vsValues[indexOfRepeat]

      let vsValue
      if (vsThrow) {
        vsValue = vsThrow.finalResults[0]
      } else { // If we have more repeats requested than vs values, we use the last vs value
        vsValue = thisThrow.vsValues[thisThrow.vsValues.length - 1].finalResults[0]
      }

      if (!thisThrow.vsResults) {
        thisThrow.vsResults = []
      }

      let vsResult = (finalResult >= vsValue ? VS_CHECK_RESULTS.success : VS_CHECK_RESULTS.failure)
      if (thisThrow.specialResults) {
        thisThrow.specialResults[i].forEach(specialResult => {
          switch (specialResult) {
            case SPECIAL_THROW_RESULTS.criticalSuccessDnD4: {
              vsResult = VS_CHECK_RESULTS.criticalDnD4
              break
            }
            case SPECIAL_THROW_RESULTS.criticalFailureDnD4: {
              vsResult = VS_CHECK_RESULTS.botchDnD4
              break
            }
          }
        })
      }
      thisThrow.vsResults.push(vsResult)
    }
  }
}

// -------------------------------------------------------------------------------------------------

const calculateNormalDice = (dice) => {
  let numberOfRolls = dice.number
  let numberOfSides = dice.sides

  const setMod = (name, defaultValue) => {
    const mod = dice.diceMods.find(dm => dm.type === name)
    let modValue = defaultValue
    if (mod) {
      modValue = mod.value
    }
    return modValue
  }

  const checkOverUnderEqual = (thisDieResult, over, under, equal) => {
    if (over !== -1 && thisDieResult > over) {
      return 1
    } else if (under !== -1 && thisDieResult < under) {
      return 1
    } else if (equal !== -1 && thisDieResult === equal) {
      return 1
    }
    return 0
  }

  const explodeOn = setMod(DICE_MODIFIERS.explode, -1)
  const explodeTimesMax = setMod(DICE_MODIFIERS.explodeTimes, MAX_EXPLOSIONS)
  const countOver = setMod(DICE_MODIFIERS.countOver, -1)
  const countUnder = setMod(DICE_MODIFIERS.countUnder, -1)
  const countEqual = setMod(DICE_MODIFIERS.countEqual, -1)
  const isCounting = (countOver > 0 || countUnder > 0 || countEqual > 0)
  const keepHighest = setMod(DICE_MODIFIERS.keepHighest, -1)
  const keepLowest = setMod(DICE_MODIFIERS.keepLowest, -1)
  const reRollIfOver = setMod(DICE_MODIFIERS.reRollIfOver, -1)
  const reRollIfUnder = setMod(DICE_MODIFIERS.reRollIfUnder, -1)
  const reRollIfEquals = setMod(DICE_MODIFIERS.reRollIfEquals, -1)
  const reRollIfTotalOver = setMod(DICE_MODIFIERS.reRollIfTotalOver, -1)
  const reRollIfTotalUnder = setMod(DICE_MODIFIERS.reRollIfTotalUnder, -1)
  const reRollIfTotalEquals = setMod(DICE_MODIFIERS.reRollIfTotalEquals, -1)
  const reRollTimesMax = setMod(DICE_MODIFIERS.reRollTimes, MAX_RE_ROLLS)
  const criticalOn = setMod(DICE_MODIFIERS.critical, -1)
  const botchOn = setMod(DICE_MODIFIERS.botch, -1)

  const mod = (dice.type === FORMULA_PART_TYPES.operands.fudgeDice ? -2 : 0)

  const diceResults = []
  let finalResult = 0

  let continueReRollingTotal = true
  let reRollTotalNumber = 0

  while (continueReRollingTotal) {
    const thisDiceResults = []
    finalResult = 0
    for (let i = 0; i < numberOfRolls; i++) {
      let continueReRolling = true
      let reRollNumber = 0
      let thisReRollDiceResult
      while (continueReRolling) {
        let thisDieResult = 0
        if (explodeOn !== -1) {
          let explosionsNumber = 0
          let continueExploding = true
          const resultWithExplosions = []
          while (continueExploding) {
            const result = roll(numberOfSides) + mod
            thisDieResult += result

            if (result >= explodeOn) {
              if (explosionsNumber === explodeTimesMax) {
                continueExploding = false
              } else {
                explosionsNumber++
              }
            } else {
              continueExploding = false
            }

            resultWithExplosions.push({
              type: continueExploding ? RESULT_TYPES.exploded : RESULT_TYPES.final,
              result
            })
          }

          const diceResult =
            {index: i, result: thisDieResult, type: RESULT_TYPES.final}
          if (resultWithExplosions.length > 1) {
            diceResult.explosions = resultWithExplosions
          }
          thisReRollDiceResult = diceResult
        } else {
          const result = roll(numberOfSides) + mod
          thisDieResult += result

          thisReRollDiceResult = {
            index: i,
            type: RESULT_TYPES.final,
            result
          }
        }

        if (checkOverUnderEqual(thisDieResult, reRollIfOver, reRollIfUnder, reRollIfEquals)) {
          if (reRollNumber === reRollTimesMax) {
            continueReRolling = false
          } else {
            reRollNumber++
          }
          if (continueReRolling) {
            thisReRollDiceResult.type = RESULT_TYPES.ignored
          }
        } else {
          continueReRolling = false
        }
        thisDiceResults.push(thisReRollDiceResult)
      }
    }

    let sortedResults = [...thisDiceResults].sort((a, b) => a.result - b.result)
    if (keepLowest !== -1) {
      sortedResults = sortedResults.slice(0, keepLowest)
    } else if (keepHighest !== -1) {
      sortedResults = sortedResults.slice((keepHighest * -1))
    }

    thisDiceResults.forEach(result => {
      if (sortedResults.find(
        remainingResult => remainingResult.index === result.index)) {
        if (!isCounting && result.type !== RESULT_TYPES.ignored) {
          finalResult += result.result
          if (!dice.specialResults) dice.specialResults = []
          let specialResults = []
          if (criticalOn !== -1 && result.result >= criticalOn) {
            result.type = RESULT_TYPES.critical
            if (numberOfRolls === 1) {
              if (dice.type === FORMULA_PART_TYPES.operands.dnd4Dice) {
                specialResults.push(SPECIAL_THROW_RESULTS.criticalSuccessDnD4)
              }
              specialResults.push(SPECIAL_THROW_RESULTS.criticalSuccess)
            }
          }
          else if (botchOn !== -1 && result.result <= botchOn) {
            result.type = RESULT_TYPES.botch
            if (numberOfRolls === 1) {
              if (dice.type === FORMULA_PART_TYPES.operands.dnd4Dice) {
                specialResults.push(SPECIAL_THROW_RESULTS.criticalFailureDnD4)
              }
              specialResults.push(SPECIAL_THROW_RESULTS.criticalFailure)
            }
          }
          dice.specialResults.push(specialResults)
        }
        diceResults.push({
          type: result.type, result: result.result, explosions: result.explosions
        })
      } else {
        diceResults.push({
          type: RESULT_TYPES.ignored, result: result.result, explosions: result.explosions
        })
      }
    })
    if (isCounting) {
      diceResults.forEach(result => {
        if (result.type !== RESULT_TYPES.ignored) {
          finalResult += checkOverUnderEqual(result.result, countOver, countUnder, countEqual)
        }
      })
    }

    if (checkOverUnderEqual(
      finalResult, reRollIfTotalOver, reRollIfTotalUnder, reRollIfTotalEquals
    )) {
      if (reRollTotalNumber === reRollTimesMax) {
        continueReRollingTotal = false
      } else {
        reRollTotalNumber++
      }
      if (continueReRollingTotal) {
        diceResults.forEach(result => { result.type = RESULT_TYPES.ignored })
      }
    } else {
      continueReRollingTotal = false
    }
  }

  if (!dice.results) {
    dice.results = []
  }
  dice.results.push(diceResults)

  if (!dice.finalResults) {
    dice.finalResults = []
  }
  dice.finalResults.push(finalResult)
}

// -------------------------------------------------------------------------------------------------

const roll = (dieSides) => {
  if(dieSides === 0) {
    return 0;
  }
  return random.integer(1, dieSides)
}

/* ================================================================================================
                                        DISPLAYING STUFF
================================================================================================ */

const getCommandText = () => {
  if (!throws || !throws.length) {
    return ''
  }

  let text = ''
  throws.forEach((t, index) => {
    if (index > 0) {
      if (t.isConditional) {
        text += ' ' + THROW_SEPARATOR_VS + ' '
      } else {
        text += THROW_SEPARATOR + ' '
      }
    }
    text += getThrowFormulaText(t)
    if (t.comment) {
      if (t.shouldAppendComment) {
        text += ' ' + APPEND_COMMENT_SEPARATOR + ' '
      } else {
        text += ' ' + COMMENT_SEPARATOR + ' '
      }
      text += t.comment
    }
  })

  return text
}

const getThrowFormulaText = t => {
  if (!t.formulaParts || !t.formulaParts.length) {
    return ''
  }

  const childThrowsTexts = []
  if (t.childThrows && t.childThrows.length) {
    t.childThrows.forEach(childThrow => {
      childThrowsTexts.push(getThrowFormulaText(childThrow))
    })
  }

  let text = ''
  t.formulaParts.forEach(formulaPart => {
    switch (formulaPart.type) {
      case FORMULA_PART_TYPES.operators.subtract:
      case FORMULA_PART_TYPES.operators.sum: {
        text += ' ' + formulaPart.type + ' '
        break
      }
      case FORMULA_PART_TYPES.operands.number: {
        text += formulaPart.value.toString()
        break
      }
      case FORMULA_PART_TYPES.operands.child: {
        text += OPENING_PARENTHESIS + childThrowsTexts[formulaPart.index] + CLOSING_PARENTHESIS
        break
      }
      case FORMULA_PART_TYPES.operands.normalDice: {
        text += formulaPart.number.toString() + NORMAL_DICE_SYMBOL + formulaPart.sides.toString()
        if (formulaPart.diceMods && formulaPart.diceMods.length) {
          formulaPart.diceMods.forEach(diceMod => {
            text += diceMod.type + diceMod.value.toString()
          })
        }
        break
      }
      case FORMULA_PART_TYPES.operands.fudgeDice: {
        text += FUDGE_DICE_SYMBOLS[0]
        if (formulaPart.diceMods && formulaPart.diceMods.length) {
          formulaPart.diceMods.forEach(diceMod => {
            text += diceMod.type + diceMod.value.toString()
          })
        }
        break
      }
      case FORMULA_PART_TYPES.operands.dnd4Dice: {
        text += DND4_SYMBOL
        if (formulaPart.diceMods && formulaPart.diceMods.length) {
          formulaPart.diceMods.forEach(diceMod => {
            if (!diceMod.default) {
              text += diceMod.type + diceMod.value.toString()
            }
          })
        }
        break
      }
      case FORMULA_PART_TYPES.operands.rnkDice: {
        const keepHighestMod = formulaPart.diceMods.find(
          diceMod => diceMod.type === DICE_MODIFIERS.keepHighest
        )
        text += formulaPart.number.toString() + RNK_DICE_SYMBOL +
          (keepHighestMod.value || 'ERROR').toString()
        if (formulaPart.diceMods && formulaPart.diceMods.length) {
          formulaPart.diceMods.forEach(diceMod => {
            if (!diceMod.default && diceMod.type !== DICE_MODIFIERS.keepHighest) {
              text += diceMod.type + diceMod.value.toString()
            }
          })
        }
        break
      }
    }
  })

  if (t.repeatNumber && t.repeatNumber > 1
    && (!t.vsValues || !t.vsValues.length || t.repeatNumber !== t.vsValues.length)) {
      text += ' ' + REPEAT_THROW_SEPARATOR + ' ' + t.repeatNumber.toString()
  }

  if (t.vsValues && t.vsValues.length) {
    text += ' ' + VERSUS_SEPARATOR + ' '
    t.vsValues.forEach((vsThrow, index) => {
      text += getThrowFormulaText(vsThrow)
      if (index < t.vsValues.length - 1) {
        text += VERSUS_PARTS_SEPARATOR + ' '
      }
    })
    if (t.vsValues[t.vsValues.length - 1].shouldRepeat) {
      text += VERSUS_REPEATER
    } else if (t.vsValues[t.vsValues.length - 1].shouldReRoll) {
      text += VERSUS_REROLLER
    }
  }
  return text
}

const showResults = async () => {
  if (!throws || !throws.length) {
    return
  }
  const replyMessage = await reply(
    formatThrowResults({throws, DEFAULT_THROW_RESULT_FORMAT_NAME}), message)
  if (!replyMessage) {
    clearEverything()
    return
  }

  if (USE_INTERACTIVE_REACTIONS) {
    const pairs = {}
    try {
      pairs[MESSAGES_COLUMNS.message_id] = replyMessage.id
      pairs[MESSAGES_COLUMNS.channel_id] = message.channel.id
      pairs[MESSAGES_COLUMNS.type] = MESSAGE_TYPES.rollResult
      pairs[MESSAGES_COLUMNS.content] = JSON.stringify({
        messageId: message.id,
        prefix: prefix,
        commandName: commandName,
        throws: throws
      })
      pairs[MESSAGES_COLUMNS.user_id] = message.author.id
      clearEverything()
    } catch (error) {
      logger.error(`Failed to set pairs for a roll results message`, error)
      return
    }
    try {
      await pg.db.none('INSERT INTO ${db#} (${pairs~}) VALUES (${pairs:list})',
        {
          db: pg.addPrefix(MESSAGES_DB_NAME),
          pairs
        })
    } catch (error) {
      logger.error(`Failed to save a roll results message`, error)
      return
    }
    try {
      await Promise.all([
        replyMessage.react(B_EMOJI), replyMessage.react(M_EMOJI), replyMessage.react(REPEAT_EMOJI)
      ])
    } catch (error) {
      if (error && error.name === 'DiscordAPIError') { // TODO: Figure this out
        logger.warn(`Failed to react to a warning message`, error)
      } else {
        logger.error(`Failed to react to a warning message`, error)
      }
    }
  } else {
    clearEverything()
  }
}

/* ================================================================================================
                                        OTHER STUFF
================================================================================================ */

const getThrowSeparatorRegex = () => {
  const regexString = `(${THROW_SEPARATOR}|${THROW_SEPARATOR_VS})`
  return new RegExp(regexString, 'gi')
}

const getChildThrowRegex = () => {
  const regexString = `^${OPENING_PARENTHESES_REPLACER}[0-9]+${CLOSING_PARENTHESES_REPLACER}$`
  return new RegExp(regexString, 'g')
}

const getDisallowedSymbolsRegex = () => {
  let allowedSymbols = ''
  ALLOWED_SYMBOLS.forEach(symbol => {
    allowedSymbols += `\\${symbol}`
  })
  const regexString = `[^0-9a-z\\s\\${allowedSymbols}]`
  return new RegExp(regexString, 'gi')
}

const getRepeatThrowSeparatorRegex = (shouldReturnString) => {
  const regex = `(\\${REPEAT_THROW_SEPARATOR}|(${REPEAT_THROW_SEPARATOR_AOE}))`
  if (shouldReturnString) {
    return regex
  }
  else return new RegExp(regex, 'gi')
}

const getRepeatThrowRegex = () => {
  const regexString = `${getRepeatThrowSeparatorRegex(true)}\\s?\\d+`
  return new RegExp(regexString, 'gi')
}

const getNormalDiceRegex = () => {
  const regexString = `^\\d*${NORMAL_DICE_SYMBOL}\\d+`
  return new RegExp(regexString, 'gi')
}

const getRnKDiceRegex = () => {
  const regexString = `^\\d*${RNK_DICE_SYMBOL}\\d+`
  return new RegExp(regexString, 'gi')
}

const getDiceModifierRegex = () => {
  const regexString = `[a-z]+\\s?\\d+`
  return new RegExp(regexString, 'gi')
}

const getTypoOrCommentHint = () => {
  return nws`Perhaps you've made a typo or a \`${COMMENT_SEPARATOR}\` symbol to mark it as \
        a comment`
}