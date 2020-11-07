const {
  THROW_RESULTS_FORMATS,
  DEFAULT_THROW_RESULT_FORMAT_NAME,
  FORMULA_PART_TYPES,
  FUDGE_DICE_NUMBER,
  FUDGE_SYMBOL,
  NORMAL_DICE_SYMBOL,
  RNK_DICE_SYMBOL,
  DICE_MODIFIERS,
  OPENING_PARENTHESIS,
  CLOSING_PARENTHESIS,
  RESULT_TYPES,
  SPECIAL_THROW_RESULTS,
  FUDGE_RESULT_SYMBOLS,
  VS_CHECK_RESULTS
} = require('./constants')

module.exports = (args) => {
  const { throws, formatName } = args
  let format = THROW_RESULTS_FORMATS[formatName]
  if (!format) format = THROW_RESULTS_FORMATS[DEFAULT_THROW_RESULT_FORMAT_NAME]

  return getFormattedTextFromThrows(throws, format)
}

const getFormattedTextFromThrows = (throws, format) => {
  if (!throws || !throws.length) {
    return 'no throws were made.'
  }

  let text = ''
  const filteredThrows = throws.filter(t => !t.isSkipped)
  let hasUnconditionalThrows = false
  filteredThrows.forEach((t, index) => {
    const throwText = getFormattedTextFromThrow(t, format, filteredThrows[index + 1])
    text += throwText
    if (throwText && index < filteredThrows.length - 1) {
      if (filteredThrows[index + 1].isConditional) {
        text += format.space + format.conditionalThrowSeparator + format.space
      } else {
        hasUnconditionalThrows = true
        if (format.addThrowSeparatorAfterListEnd || !t.repeatNumber || t.repeatNumber < 2) {
          text += format.throwSeparator
        }
      }
    }
  })
  if (hasUnconditionalThrows) {
    text = format.throwsStart + text + format.throwsEnd
  }

  return text
}

const getFormattedCommentText = (comment, format) => {
  comment = comment.replace(/\*\*(.*?(?:\*\*|$))/gm, format.boldStart + '$1')
    .replace(/\*\*/gm, format.boldEnd)
  comment = comment.replace(/\*(.*?(?:\*|$))/gm, format.italicsStart + '$1')
    .replace(/\*/gm, format.italicsEnd)
  comment = comment.replace(/__(.*?(?:__|$))/gm, format.underlineStart + '$1')
      .replace(/__/gm, format.underlineEnd)
  comment = comment.replace(/_(.*?(?:_|$))/gm, format.italicsStart + '$1')
    .replace(/_/gm, format.italicsEnd)
  comment =
    comment.replace(/~~(.*?(?:~~|$))/gm, format.strikethroughStart + '$1')
    .replace(/~~/gm, format.strikethroughEnd)
  return comment
}

const getFormattedTextFromThrow = (t, format, nextThrow) => {
  const isLast = !nextThrow

  if (!t.formulaParts || !t.formulaParts.length) {
    if (!t.comment) {
      return ''
    }
    return format.codeStart + getFormattedCommentText(t.comment, format) + format.codeEnd
  }

  const isSingleNumber = () => {
    if (t.formulaParts && t.formulaParts.length) {
      const numberOperands = t.formulaParts.filter(
        formulaPart => formulaPart.type === FORMULA_PART_TYPES.operands.number)
      const totalOperands = t.formulaParts.filter(
        formulaPart => Object.keys(FORMULA_PART_TYPES.operands).indexOf(formulaPart.type) !== -1)
      if (numberOperands.length === 1 && totalOperands.length === 1) {
        return true
      }
    }
    return false
  }

  let text = ''
  const formulaText = getFormulaText(t, format)

  if (t.repeatNumber && t.repeatNumber > 1) {
    if (t.comment) {
      text = format.codeStart + getFormattedCommentText(t.comment, format) + ':' + format.codeEnd +
        format.space
    }
    text += formulaText + ' (' + t.repeatNumber + ' rolls):\n' + format.listStart
    for (let i = 0; i < t.repeatNumber; i++) {
      if (t.repeatNumber > 1) {
        text += format.listItemStart + 'Roll ' + (i+1) + ':' + format.space
      }
      const intermediateText = getIntermediateResultsText(t, format, i, t.repeatNumber)
      text += intermediateText

      const finalResultText = getFinalResultText(t, format, i, t.repeatNumber)

      // NOTE: This is kind of a hack, and if it turns out this causes bugs, there should be an
      // actual check here for whether the throw consists of only one number
      // (optionally with a minus before)
      if (isSingleNumber() || !intermediateText) {
        text += finalResultText
      } else {
        text += format.space + '=' + format.space + finalResultText
      }

      if ((i < t.repeatNumber - 1) || !isLast) {
        text += ';' + format.listItemEnd + '\n'
      } else {
        text += '.' + format.listItemEnd
      }
    }
    text += format.listEnd
  } else {
    let commentText = ''
    if (t.comment && !t.shouldAppendComment) {
      commentText = format.codeStart + getFormattedCommentText(t.comment, format) + ':' +
        format.codeEnd + format.space
    }
    text += commentText + formulaText
    const intermediateResultText = getIntermediateResultsText(t, format, 0, 1)

    if (intermediateResultText) {
      text += format.space + '=' + format.space + intermediateResultText
    }

    const finalResultText = getFinalResultText(t, format, 0, 1)

    // NOTE: This is kind of a hack, and if it turns out this causes bugs, there should be an actual
    // check here for whether the throw consists of only one number (optionally with a minus before)
    if (isSingleNumber()) {
      text = commentText + finalResultText
    } else {
      text += format.space + '=' + format.space + finalResultText
    }

    if (t.comment && t.shouldAppendComment) {
      text += format.space + format.codeStart + getFormattedCommentText(t.comment, format) +
        format.codeEnd
    }
  }

  return text
}

const getFormulaText = (t, format, showResults, repeatIndex) => {
  let text = ''

  let shouldSumStaticMods = false
  shouldSumStaticMods = showResults

  let previousFormulaPart = null
  let isPrecededByOperatorOrNothing = false
  t.formulaParts.forEach((formulaPart, index) => {
    switch(formulaPart.type) {
      case FORMULA_PART_TYPES.operands.number: {
        if (!shouldSumStaticMods) {
          text += getSpaceIfNeeded(previousFormulaPart, isPrecededByOperatorOrNothing, format) +
            formulaPart.value.toString()
        }
        break
      }
      case FORMULA_PART_TYPES.operands.fudgeDice: {
        text += getSpaceIfNeeded(previousFormulaPart, isPrecededByOperatorOrNothing, format)
        if (showResults) {
          text += getDiceResultsText(formulaPart.results[repeatIndex], formulaPart.type, format)
        } else {
          text += `${FUDGE_DICE_NUMBER}${NORMAL_DICE_SYMBOL}${FUDGE_SYMBOL.toUpperCase()}`
        }
        break
      }
      case FORMULA_PART_TYPES.operands.normalDice: {
        text += getSpaceIfNeeded(previousFormulaPart, isPrecededByOperatorOrNothing, format)
        if (showResults) {
          text += getDiceResultsText(formulaPart.results[repeatIndex], formulaPart.type, format)
        } else {
          text += getNormalDiceFormulaText(formulaPart)
        }
        break
      }
      case FORMULA_PART_TYPES.operands.dnd4Dice: {
        text += getSpaceIfNeeded(previousFormulaPart, isPrecededByOperatorOrNothing, format)
        if (showResults) {
          text += getDiceResultsText(formulaPart.results[repeatIndex], formulaPart.type, format)
        } else {
          text += getDnDDiceFormulaText(formulaPart)
        }
        break
      }
      case FORMULA_PART_TYPES.operands.rnkDice: {
        text += getSpaceIfNeeded(previousFormulaPart, isPrecededByOperatorOrNothing, format)
        if (showResults) {
          text += getDiceResultsText(formulaPart.results[repeatIndex], formulaPart.type, format)
        } else {
          text += getRnKDiceFormulaText(formulaPart)
        }
        break
      }
      case FORMULA_PART_TYPES.operands.child: {
        const childThrow = t.childThrows[formulaPart.index]
        const formulaText = getFormulaText(childThrow, format, showResults, repeatIndex)
        if (formulaText) {
          text += getSpaceIfNeeded(previousFormulaPart, isPrecededByOperatorOrNothing, format) +
            OPENING_PARENTHESIS + formulaText + CLOSING_PARENTHESIS
        } else {
          text += getSpaceIfNeeded(previousFormulaPart, isPrecededByOperatorOrNothing, format) +
            OPENING_PARENTHESIS + format.italicsStart + 0 + format.italicsEnd + CLOSING_PARENTHESIS
        }
        break
      }
      case FORMULA_PART_TYPES.operators.sum: {
        if (!shouldSumStaticMods || (t.formulaParts[index + 1] &&
          t.formulaParts[index + 1].type !== FORMULA_PART_TYPES.operands.number)) {
          text += (previousFormulaPart ? format.space + formulaPart.type : '')
        }
        break
      }
      case FORMULA_PART_TYPES.operators.subtract: {
        if (!shouldSumStaticMods || (t.formulaParts[index + 1] &&
          t.formulaParts[index + 1].type !== FORMULA_PART_TYPES.operands.number)) {
          text += (previousFormulaPart ? format.space : '') + formulaPart.type
        }
      }
    }

    isPrecededByOperatorOrNothing = (!previousFormulaPart
      || FORMULA_PART_TYPES.operators.hasOwnProperty(previousFormulaPart.type))
    previousFormulaPart = formulaPart
  })

  if (shouldSumStaticMods && t.staticModifiersSum) {
    text += t.formulaParts.length ? format.space : ''
    if (t.staticModifiersSum < 0) {
       text += FORMULA_PART_TYPES.operators.subtract
    } else if (t.formulaParts.length) {
      text += FORMULA_PART_TYPES.operators.sum
    }
    text += t.formulaParts.length ? format.space : ''
    text += format.italicsStart + Math.abs(t.staticModifiersSum) + format.italicsEnd
  }

  return text
}

const getDiceModsText = (formulaPart) => {
  let text = ''
  if (formulaPart.diceMods && formulaPart.diceMods.length) {
    formulaPart.diceMods.forEach(diceMod => {
      if (!diceMod.default) {
        text += diceMod.type + diceMod.value
      }
    })
  }

  return text
}

const getNormalDiceFormulaText = (formulaPart) => {
  let text = formulaPart.number + NORMAL_DICE_SYMBOL + formulaPart.sides

  return text + getDiceModsText(formulaPart)
}

const getRnKDiceFormulaText = (formulaPart) => {
  const keepHighestMod = formulaPart.diceMods.find(
    diceMod => diceMod.type === DICE_MODIFIERS.keepHighest
  )
  let text = formulaPart.number + RNK_DICE_SYMBOL + (keepHighestMod.value || 'ERROR')

  if (formulaPart.diceMods && formulaPart.diceMods.length) {
    formulaPart.diceMods.forEach(diceMod => {
      if (!diceMod.default && diceMod.type !== DICE_MODIFIERS.keepHighest) {
        text += diceMod.type + diceMod.value
      }
    })
  }

  return text
}

const getDnDDiceFormulaText = (formulaPart) => {
  let text = formulaPart.number + NORMAL_DICE_SYMBOL + formulaPart.sides

  return text + getDiceModsText(formulaPart)
}

const getDiceResultsText = (throwResults, throwType, format) => {
  if (!throwResults || !throwResults.length) {
    return ''
  }

  let text = ''

  if (throwResults.length > 1) {
    text += format.resultsStart
  }

  throwResults.forEach((throwResult, index) => {
    const isLast = (index === throwResults.length - 1)
    const nextResult = isLast ? null : throwResults[index + 1]
    if (throwResult.explosions) {
      text += getDiceResultsText(throwResult.explosions, throwType, format)
    } else {
      switch (throwResult.type) {
        case RESULT_TYPES.final: {
          text += getDiceResultText(throwResult, throwType)
          break
        }
        case RESULT_TYPES.ignored: {
          if (index === 0) {
            text += format.strikethroughStart
          }
          text += getDiceResultText(throwResult, throwType) +
            format.strikethroughEnd
          break
        }
        case RESULT_TYPES.exploded: {
          text += getDiceResultText(throwResult, throwType) +
            format.codeStart + format.explosion + format.codeEnd
          break
        }
        case RESULT_TYPES.critical: {
          text += getDiceResultText(throwResult, throwType) +
            format.codeStart + format.critical + format.codeEnd
          break
        }
        case RESULT_TYPES.botch: {
          text += getDiceResultText(throwResult, throwType) +
            format.codeStart + format.botch + format.codeEnd
        }
      }
    }
    if (!isLast
      && throwResult.type !== RESULT_TYPES.exploded
      && throwType !== FORMULA_PART_TYPES.operands.fudgeDice) {
      text += format.space
      if (nextResult.type === RESULT_TYPES.ignored) {
        text += format.strikethroughStart
      }
      text += FORMULA_PART_TYPES.operators.sum + format.space
    }
  })

  if (throwResults.length > 1) {
    text += format.resultsEnd
  }

  return text
}

const getDiceResultText = (throwResult, throwType) => {
  if (!throwResult) return ''

  const getFudgeDiceText = () => {
    const text = FUDGE_RESULT_SYMBOLS[throwResult.result + 1]
    if (!text) return 'ERROR'
    return text
  }

  switch (throwType) {
    case FORMULA_PART_TYPES.operands.rnkDice:
    case FORMULA_PART_TYPES.operands.dnd4Dice:
    case FORMULA_PART_TYPES.operands.normalDice: {
      return throwResult.result.toString()
    }
    case FORMULA_PART_TYPES.operands.fudgeDice: {
      return getFudgeDiceText()
    }
    default: {
      return 'ERROR'
    }
  }
}

const checkForNonStaticParts = (t) => {
  const getNonStaticPartsAndOperandsNumbers = (t) => {
    let nonStaticPartsNumber = 0
    let operandsNumber = 0

    for (let i = 0; i < t.formulaParts.length; i++) {
      const formulaPart = t.formulaParts[i]
      switch (formulaPart.type) {
        case FORMULA_PART_TYPES.operands.rnkDice:
        case FORMULA_PART_TYPES.operands.dnd4Dice:
        case FORMULA_PART_TYPES.operands.normalDice:
        case FORMULA_PART_TYPES.operands.fudgeDice: {
          nonStaticPartsNumber += formulaPart.number
          operandsNumber++
          break
        }
        case FORMULA_PART_TYPES.operands.child: {
          const result =  getNonStaticPartsAndOperandsNumbers(t.childThrows[formulaPart.index])
          nonStaticPartsNumber += result.nonStaticPartsNumber
          operandsNumber += result.operandsNumber
          break
        }
        case FORMULA_PART_TYPES.operands.number: {
          operandsNumber++
          break
        }
        default: { /* no need to do anything here */
        }
      }
      if (nonStaticPartsNumber > 1) break
    }
    return { nonStaticPartsNumber, operandsNumber }
  }

  const result = getNonStaticPartsAndOperandsNumbers(t)
  return (result.nonStaticPartsNumber > 1
    || (result.nonStaticPartsNumber > 0 && result.operandsNumber > 1))
}

const isOperand = (formulaPart) => {
  return Object.values(FORMULA_PART_TYPES.operators).indexOf(formulaPart.type) === -1
}

const getNonStaticIntermediateResultsText = (t) => {
  const nonRedundantThrow = JSON.parse(JSON.stringify(t))
  const filteredParts = nonRedundantThrow.formulaParts.filter(formulaPart => {
    return formulaPart.type !== FORMULA_PART_TYPES.operands.number
  })

  if (nonRedundantThrow.childThrows && nonRedundantThrow.childThrows.length) {
    nonRedundantThrow.childThrows.forEach((childThrow, index) => {
      nonRedundantThrow.childThrows[index] = getNonStaticIntermediateResultsText(childThrow)
    })
  }

  const nonRedundantParts = []
  filteredParts.forEach((formulaPart, index) => {
    const thisPart = JSON.parse(JSON.stringify(formulaPart))
    const nextPart = index < filteredParts.length - 1 ? filteredParts[index + 1] : null
    if (isOperand(formulaPart)) {
      nonRedundantParts.push(thisPart)
    } else if (nextPart && isOperand(nextPart)) {
      if (!index) {
        if (thisPart.type === FORMULA_PART_TYPES.operators.subtract) {
          nonRedundantParts.push(thisPart)
        }
      } else {
        nonRedundantParts.push(thisPart)
      }
    }
  })

  nonRedundantThrow.formulaParts = nonRedundantParts

  return nonRedundantThrow
}

const getIntermediateResultsText = (t, format, index) => {
  if (!checkForNonStaticParts(t)) {
    return ''
  }

  const nonRedundantThrow = getNonStaticIntermediateResultsText(t, format, index)
  return getFormulaText(nonRedundantThrow, format, true, index)
}

const getFinalResultText = (t, format, index) => {
  if (!t.finalResults || !t.finalResults.length) {
    return ''
  }
  let text = format.boldStart + t.finalResults[index].toString() + format.boldEnd
  if (t.specialResults && t.specialResults.length
    && t.specialResults[index] && t.specialResults[index].length) {
    t.specialResults[index].forEach(specialResult => {
      switch (specialResult) {
        case SPECIAL_THROW_RESULTS.criticalSuccess: {
          text += format.codeStart + format.critical + format.codeEnd
          break
        }
        case SPECIAL_THROW_RESULTS.criticalFailure: {
          text += format.codeStart + format.botch + format.codeEnd
          break
        }
      }
    })
  }

  if (t.vsValues && t.vsValues[index]) {
    text += format.space + format.vs + format.space
    const intermediateVsResult = getIntermediateResultsText(t.vsValues[index], format, index)
    if (intermediateVsResult) {
      text += intermediateVsResult + format.space + '=' + format.space
    }
    text += t.vsValues[index].finalResults[0] + ',' + format.space
    if (t.vsResults && t.vsResults[index]) {
      switch(t.vsResults[index]) {
        case VS_CHECK_RESULTS.success: {
          text += format.boldStart + 'success' + format.boldEnd
          break
        }
        case VS_CHECK_RESULTS.criticalDnD4: {
          text += format.boldStart + 'critical success' + format.boldEnd
          break
        }
        case VS_CHECK_RESULTS.failure: {
          text += format.italicsStart + 'failure' + format.italicsEnd
          break
        }
        case VS_CHECK_RESULTS.botchDnD4: {
          text += format.italicsStart + 'critical failure' + format.italicsEnd
          break
        }
      }
    }
  }
  return text
}

// -------------------------------------------------------------------------------------------------

const getSpaceIfNeeded = (previousFormulaPart, isPrecededByOperatorOrNothing, format) => {
  if (!previousFormulaPart) return ''
  if (previousFormulaPart.type === FORMULA_PART_TYPES.operators.subtract
    && isPrecededByOperatorOrNothing) {
    return ''
  }
  return format.space
}