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

  let text = format.throwsStart
  const filteredThrows = throws.filter(t => !t.isSkipped)
  filteredThrows.forEach((t, index) => {
    const throwText = getFormattedTextFromThrow(t, format, filteredThrows[index + 1])
    text += throwText
  })

  return text
}

const getFormattedTextFromThrow = (t, format, nextThrow) => {
  let text = ''
  const formulaText = getFormulaText(t, format)
  const isLast = !nextThrow

  if (t.repeatNumber && t.repeatNumber > 1) {
    if (t.comment) {
      text = format.codeStart + t.comment + ':' + format.codeEnd + format.space
    }
    text += formulaText + ' (' + t.repeatNumber + ' rolls):\n' + format.listStart
    for (let i = 0; i < t.repeatNumber; i++) {
      if (t.repeatNumber > 1) {
        text += format.listItemStart + 'Roll ' + (i+1) + ':' + format.space
      }
      const intermediateText = getIntermediateResultsText(t, format, i, t.repeatNumber)
      text += intermediateText

      const finalResultText = getFinalResultText(t, format, i, t.repeatNumber)

      // NOTE: This is kind of a hack, and if it turns out this causes bugs, there should be an actual
      // check here for whether the throw consists of only one number (optionally with a minus before)
      if (formulaText === finalResultText || !intermediateText) {
        text += finalResultText
      } else {
        text += format.space + '=' + format.space + finalResultText
      }

      if ((i < t.repeatNumber - 1) || !isLast) {
        text += ';' + format.listItemEnd + '\n'
      } else {
        text += '.' + format.listItemEnd
      }

      if (!isLast && (i === t.repeatNumber - 1) && nextThrow.isConditional) {
        text += format.conditionalThrowSeparator + format.space
      }
    }
    text += format.listEnd
  } else {
    if (t.comment && !t.shouldAppendComment) {
      text = format.codeStart + t.comment + ':' + format.codeEnd + format.space
    }
    text += formulaText
    const intermediateResultText = getIntermediateResultsText(t, format, 0, 1)

    if (intermediateResultText) {
      text += format.space + '=' + format.space + intermediateResultText
    }

    const finalResultText = getFinalResultText(t, format, 0, 1)

    // NOTE: This is kind of a hack, and if it turns out this causes bugs, there should be an actual
    // check here for whether the throw consists of only one number (optionally with a minus before)
    if (formulaText === finalResultText) {
      text = finalResultText
    } else {
      text += format.space + '=' + format.space + finalResultText
    }

    if (t.comment && t.shouldAppendComment) {
      text += format.space + format.codeStart + t.comment + format.codeEnd
    }

    if (!isLast) {
      if (nextThrow.isConditional) {
        text += format.space + format.conditionalThrowSeparator + format.space
      } else {
        text += format.throwSeparator
      }
    } else {
      text += format.throwsEnd
    }
  }

  return text
}

const getFormulaText = (t, format, showResults, repeatIndex) => {
  let text = ''

  let shouldSumStaticMods = false
  if (!t.childThrows || !t.childThrows.length) {
    shouldSumStaticMods = showResults
  }

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
        text += getSpaceIfNeeded(previousFormulaPart, isPrecededByOperatorOrNothing, format) +
          OPENING_PARENTHESIS +
          getFormulaText(childThrow, format, showResults, repeatIndex) +
          CLOSING_PARENTHESIS
        break
      }
      case FORMULA_PART_TYPES.operators.sum:
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
    text += format.space
    if (t.staticModifiersSum < 0) {
       text += FORMULA_PART_TYPES.operators.subtract
    } else {
      text += FORMULA_PART_TYPES.operators.sum
    }
    text += format.space + format.italicsStart + Math.abs(t.staticModifiersSum) + format.italicsEnd
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
    if (throwResult.explosions) {
      text += getDiceResultsText(throwResult.explosions, throwType, format)
    } else {
      switch (throwResult.type) {
        case RESULT_TYPES.final: {
          text += getDiceResultText(throwResult, throwType)
          break
        }
        case RESULT_TYPES.ignored: {
          text += format.strikethroughStart + getDiceResultText(throwResult, throwType) +
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
      text += format.space + FORMULA_PART_TYPES.operators.sum + format.space
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

const getIntermediateResultsText = (t, format, index) => {
  let text = ''

  if (!checkForNonStaticParts(t)) {
    return text
  }

  text += getFormulaText(t, format, true, index)
  return text
}

const getFinalResultText = (t, format, index) => {
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