const random = require('random');
const _ = require('underscore');

module.exports = args => {
    const rollMessages = args.commandText.split(';');
    processRollMessages(args.message, rollMessages);
};

const processRollMessages = function (message, rollMessages) {
    let replyText = '';
    if (!rollMessages) {
        replyText = 'No roll';
    }
    else {
        for (let i = 0; i < rollMessages.length; i++) {
            replyText += processRoll(rollMessages[i]);
            if (i < (rollMessages.length - 1)) {
                replyText += '\n';
            }
        }
    }

    if (!replyText) {
        return;
    }

    return message.reply(replyText).catch(console.error);
};


const processRoll = function(roll) {
    let doWeNeedIntermediateResult = false;
    let result = '';

    let comment = '';
    let indexOfCommentSymbol = roll.indexOf('?');
    if (indexOfCommentSymbol > 0) {
        comment = roll.slice(indexOfCommentSymbol + 1).trim();
        roll = roll.slice(0, indexOfCommentSymbol);
    }

    // Now that we've removed any readable text for the comment, time to standartize the roll string by
    // making it lowercase and removing any and all whitespace symbols
    roll = roll.toLowerCase();
    roll = roll.replace(/\s/g, '');

    let vsValues = [];
    roll = roll.replace(/\u043c\u044b/gi, 'vs');
    let indexOfVsSymbol = roll.indexOf('vs');
    if (indexOfVsSymbol > 0) {
        const vsText = roll.slice(indexOfVsSymbol + 2);
        roll = roll.slice(0, indexOfVsSymbol);
        if(vsText.length) {
            const vsTextParts = vsText.split(',');
            if(vsTextParts.length) {
                _.each(vsTextParts, function(vsTextPart) {
                    if(!isNaN(vsTextPart)) {
                        vsValues.push(parseInt(vsTextPart));
                    }
                    else {
                        return 'ERROR: "versus" value "' + vsTextPart + '" is not a number';
                    }
                });
            }
            else {
                return 'ERROR: "versus" part is incomplete';
            }
        }
        else {
            return 'ERROR: "versus" part is empty';
        }
    }

    roll = roll.replace(/([\u0414\u0434\u0412\u0432])/g, 'd');
    roll = roll.replace(/([\u0424\u0444\u0410\u0430])/g, 'f');
    roll = roll.replace(/AOE|\u0430\u043E\u0435|\u0424\u0429\u0423/gi, 'aoe');
    roll = roll.replace(/([\u041a\u043a\u041b\u043b])/g, 'k');

    let times = 1;
    let timesText = '';
    let isAoE = false;
    let indexOfMultipleRollsSymbol = roll.indexOf('aoe');
    if (indexOfMultipleRollsSymbol > 0) {
        isAoE = true;
        timesText = roll.slice(indexOfMultipleRollsSymbol + 3);
        roll = roll.slice(0, indexOfMultipleRollsSymbol);
        if (isNaN(timesText)) {
            return 'ERROR: AoE roll multiplier is not a number: ' + timesText;
        }
        times = parseInt(timesText);
        if ((times < 1) || (times > 20)) {
            return 'ERROR: wrong AoE roll multiplier (it should be between 1 and 20): ' + times;
        }
    }
    else {
        indexOfMultipleRollsSymbol = roll.indexOf('*');
        if (indexOfMultipleRollsSymbol > 0) {
            timesText = roll.slice(indexOfMultipleRollsSymbol + 1);
            roll = roll.slice(0, indexOfMultipleRollsSymbol);
            if (isNaN(timesText)) {
                return 'ERROR: roll multiplier is not a number: ' + timesText;
            }
            times = parseInt(timesText);
            if ((times < 1) || (times > 20)) {
                return 'ERROR: wrong roll multiplier (it should be between 1 and 20): ' + times;
            }
        }
    }

    if (!roll) {
        return '';
    }

    let rollInstances = [];
    let rollParts = [];
    let currentPart = '';
    let isNegative = false;
    let processedPart;
    let isFudgeRoll = false;

    let characters = roll.split('');

    const finishPart = function() {
        if (currentPart) {
            processedPart = processRollPart(currentPart, isNegative);
            if(processedPart.type === 'error') {
                return 'ERROR: a roll part is invalid: ' + processedPart.text;
            }
            isFudgeRoll = processedPart.type === 'fudgeDie' ? true : isFudgeRoll;
            doWeNeedIntermediateResult = processedPart.doWeNeedIntermediateResult ? true : doWeNeedIntermediateResult;
            rollParts.push(processedPart);
            currentPart = '';
        }
    };

    _.each(characters, function (char) {
        if (char === '+') {
            let error = finishPart();
            if(error) {
                return error;
            }
            isNegative = false;
        }
        else if (char === '-') {
            let error = finishPart();
            if(error) {
                return error;
            }
            isNegative = true;
        }
        else {
            currentPart += char;
        }
    });

    let error = finishPart();
    if(error) {
        return error;
    }

    rollInstances.push(rollParts);
    for (let j = 1; j < times; j++) {
        let newRollParts = [];
        for (let i = 0; i < rollParts.length; i++) {
            processedPart = processRollPart(rollParts[i].text, rollParts[i].isNegative);
            if(processedPart.type === 'error') {
                return 'ERROR: a roll part is invalid: ' + processedPart.text;
            }
            newRollParts.push(processedPart);
        }
        rollInstances.push(newRollParts);
    }

    if (comment) {
        result = '`' + comment + ':` ';
    }

    let intermediateResultString = '';
    let secondIntermediateResultString = '';
    let endResult = 0;
    let dicePartsNum = 0;
    let inputString = '';


    for (let j = 0; j < rollInstances.length; j++) {
        rollParts = rollInstances[j];
        inputString = '';
        if (timesText && !isAoE) {
            intermediateResultString += '(';
            inputString = '(';
        }

        if (isAoE) {
            intermediateResultString += ' > Roll ' + (j + 1) + ': ';
        }

        let bonusesSum = 0;
        let currentMultiplierSum = 0;
        let diceRollText = '';

        for (let i = 0; i < rollParts.length; i++) {
            if (rollParts[i].type === 'bonus') {
                bonusesSum += rollParts[i].isNegative ? (-1 * rollParts[i].value) : rollParts[i].value;
                if ((i === 0) && (rollParts[i].isNegative)) {
                    inputString += '-';
                }

                if(!isFudgeRoll) {
                    if (i > 0) {
                        inputString += rollParts[i].isNegative ? ' - ' : ' + ';
                    }
                    inputString += rollParts[i].text;
                }
                else {
                    if (i > 0) {
                        inputString += ' + ';
                    }
                    let fudgeValue = rollParts[i].isNegative ? rollParts[i].value * -1 : rollParts[i].value;
                    inputString += translateNumberToFudgeRoll(fudgeValue);
                }
            }
            else {
                if ((i === 0) && (rollParts[i].isNegative)) {
                    inputString += '-';
                    intermediateResultString += '-';
                }

                if (i > 0) {
                    inputString += rollParts[i].isNegative ? ' - ' : ' + ';
                    if (dicePartsNum > 0) {
                        intermediateResultString += rollParts[i].isNegative ? ' - ' : ' + ';
                    }
                }

                inputString += rollParts[i].text;
                if(rollParts[i].type === 'fudgeDie') {
                    intermediateResultString += rollParts[i].resultText;
                }
                else if(rollParts[i].type === 'die') {
                    diceRollText += rollParts[i].resultText;
                }
                else {
                    diceRollText += rollParts[i].text;
                }
                dicePartsNum++;
            }

            currentMultiplierSum += rollParts[i].isNegative ? (-1 * rollParts[i].value) : rollParts[i].value;
        }
        endResult += currentMultiplierSum;

        if(bonusesSum !== 0 || doWeNeedIntermediateResult) {
            intermediateResultString += diceRollText;
        }

        if (bonusesSum !== 0) {
            if(!isFudgeRoll) {
                intermediateResultString += bonusesSum < 0 ? ' - ' : ' + ';
                intermediateResultString += '_' + Math.abs(bonusesSum) + '_';
            }
            else {
                intermediateResultString += ' + ' + translateNumberToFudgeRoll(bonusesSum);
            }
            doWeNeedIntermediateResult = true;
        }

        if (timesText) {
            if (isAoE) {
                inputString += ' (AoE, ' + times + ' targets):\n';
                intermediateResultString += ' ';
                if(doWeNeedIntermediateResult) {
                    intermediateResultString += '= ';
                }
                if(!isFudgeRoll) {
                    intermediateResultString += '**' + currentMultiplierSum + '**';
                }
                else {
                    intermediateResultString += translateNumberToFudgeRoll(currentMultiplierSum);
                    if (currentMultiplierSum !== 0) {
                        intermediateResultString += ' (' + ((currentMultiplierSum > 0) ? '+' : '-') +
                            Math.abs(currentMultiplierSum) + ')';
                    }
                }
                if(vsValues[j] !== undefined) {
                    intermediateResultString += ' vs ' + vsValues[j] + ', ';
                    if(endResult >= vsValues[j]) {
                        intermediateResultString += '**success**';
                    }
                    else {
                        intermediateResultString += '_failure_';
                    }
                }
                intermediateResultString += '\n';
            }
            else {
                intermediateResultString += ')';
                if(!isFudgeRoll) {
                    secondIntermediateResultString += currentMultiplierSum;
                }
                else {
                    secondIntermediateResultString += translateNumberToFudgeRoll(currentMultiplierSum);
                    if (currentMultiplierSum !== 0) {
                        secondIntermediateResultString += ' (' + ((currentMultiplierSum > 0) ? '+' : '-') +
                            Math.abs(currentMultiplierSum) + ')';
                    }
                }
                inputString += ') x' + times;

                if (j < rollInstances.length - 1) {
                    secondIntermediateResultString += ' + ';
                    intermediateResultString += ' + ';
                }
            }
        }
        if (!isAoE) {
            inputString += '  =  ';
        }
    }

    if (dicePartsNum > 1) {
        doWeNeedIntermediateResult = true;
    }

    if (secondIntermediateResultString) {
        intermediateResultString += ' = ' + secondIntermediateResultString;
    }

    if ((doWeNeedIntermediateResult) && (dicePartsNum >= 1)) {
        if (!isAoE) {
            intermediateResultString += '  =  ';
        }
        result += inputString + intermediateResultString;
    }
    else {
        result += inputString;
    }

    if (!isAoE) {
        if(!isFudgeRoll) {
            result += '**' + endResult + '**';
        }
        else {
            result += translateNumberToFudgeRoll(endResult);
            if (endResult !== 0) {
                result += ' (' + ((endResult > 0) ? '+' : '-') + Math.abs(endResult) + ')';
            }
        }
        if(vsValues[0] !== undefined) {
            result += ' vs ' + vsValues[0] + ', ';
            if(endResult >= vsValues[0]) {
                result += '**success**';
            }
            else {
                result += '_failure_';
            }
        }
    }

    return result;
};

const processRollPart = function (rollPart, isNegative) {
    if (isNaN(rollPart)) {
        // Test for roll'n'keep die
        if (rollPart.indexOf('k') > 0) {
            let explodeOn = 10;
            const explodeOnSymbolIndex = rollPart.indexOf('e');
            if (explodeOnSymbolIndex > 0) {
                const explodeOnString = rollPart.split('e')[1];
                if (!isNaN(explodeOnString)) {
                    explodeOn = parseInt(explodeOnString);
                    explodeOn = explodeOn > 10 ? 10 : explodeOn;
                    explodeOn = (explodeOn === 1 || explodeOn < 0) ? 2 : explodeOn;
                }
                rollPart = rollPart.slice(0, explodeOnSymbolIndex);
            }
            const regexedDie = rollPart.match(/\d{0,2}([kK])\d{1,4}/);
            if (regexedDie && (regexedDie.length > 0)) {
                return processRnKDie(rollPart, isNegative, explodeOn);
            }
        }
        // Test for normal die
        const regexedDie = rollPart.match(/\d{0,2}([dD])\d{1,4}/);
        if (regexedDie && (regexedDie.length > 0)) {
            return processDie(rollPart, isNegative);
        }
        // Test for fudge die
        if ((rollPart.toLowerCase().trim() === 'f') || (rollPart.toLowerCase().trim() === '4df') ||
            (rollPart.toLowerCase().trim() === 'fudge')) {
            return processFudgeDie(rollPart, isNegative);
        }

        // Else, return error
        return {
            type: 'error',
            text: rollPart
        };
    }
    else {
        return {
            type: 'bonus',
            isNegative: isNegative,
            text: rollPart,
            value: parseInt(rollPart)
        };
    }
};

const processDie = function (die, isNegative) {
    die = die.toLowerCase().split('d');
    const diceNum = die[0] === '' ? 1 : parseInt(die[0]);
    const dieSidesNum = parseInt(die[1]);
    let doWeNeedIntermediateResult = false;

    const text = diceNum + 'd' + dieSidesNum;
    let resultText = '';
    let totalResult = 0;

    if (diceNum > 1) {
        //resultText += '(';
        doWeNeedIntermediateResult = true;
    }
    for(let i = 0; i < diceNum; i++) {
        const currentResult = roll(dieSidesNum);
        resultText += currentResult;
        if(i < diceNum - 1) {
            resultText += ' + ';
        }
        totalResult += currentResult;
    }
    /*if (diceNum > 1) {
        resultText += ')';
    }*/

    return {
        type: 'die',
        isNegative: isNegative,
        text: text,
        resultText: resultText,
        value: totalResult,
        doWeNeedIntermediateResult: doWeNeedIntermediateResult
    };
};

const processRnKDie = function (die, isNegative, explodeOn) {
    die = die.toLowerCase().split('k');
    const diceNum = die[0] === '' ? 1 : parseInt(die[0]);
    const diceKeepNum = parseInt(die[1]);
    const text = diceNum + 'k' + diceKeepNum;
    if(diceNum < diceKeepNum) {
        return {
            type: 'error',
            text: text
        };
    }
    let resultText = '';
    let totalResult = 0;
    let results = [];

    for(let i = 0; i < diceNum; i++) {
        let newRoll = roll(10);
        let currentResult = newRoll;
        let oldRoll = 0;
        if(explodeOn !== 0) {
            while (newRoll >= explodeOn) {
                if (oldRoll === 0) {
                    resultText += '(' + newRoll;
                }
                else {
                    resultText += '\u2600' + newRoll;
                    currentResult += newRoll;
                }
                oldRoll = newRoll;
                newRoll = roll(10);
            }
            if (currentResult >= explodeOn) {
                currentResult += newRoll;
                resultText += '\u2600' + newRoll + ' = ' + currentResult + ')';
            }
            else {
                resultText += currentResult;
            }
        }
        else {
            resultText += currentResult;
        }
        if(i < diceNum - 1) {
            resultText += ', ';
        }
        //totalResult += currentResult;
        results.push(currentResult);
    }
    if (diceNum > 1) {
        resultText += ' = ';
    }
    results.sort(function(a, b) { return b - a; });
    for(let i = 0; i < diceKeepNum; i++) {
        resultText += results[i];
        if(i < diceKeepNum - 1) {
            resultText += ' + ';
        }
        totalResult += results[i];
    }

    return {
        type: 'die',
        isNegative: isNegative,
        text: text,
        resultText: resultText,
        value: totalResult,
        doWeNeedIntermediateResult: true
    };
};

const processFudgeDie = function (die, isNegative) {
    const text = '4dF';
    let resultText = '';
    let totalResult = 0;

    for (let i = 0; i < 4; i++) {
        const currentResult = roll(3) - 2;
        resultText += getFudgeSymbol(currentResult);
        totalResult += currentResult;
    }

    return {
        type: 'fudgeDie',
        isNegative: isNegative,
        text: text,
        resultText: resultText,
        value: totalResult,
        doWeNeedIntermediateResult: true
    };
};

const roll = function (die) {
    return random.integer(1, die); //Math.floor((Math.random() * die) + 1);
};

const getFudgeSymbol = function (dieRoll) {
    switch (dieRoll) {
        /*case  1: return "\u2600";
        case  0: return "\u26c5";
        case -1: return "\u26c8";*/
        case  1: return '\u2795';
        case  0: return '\u25fd';
        case -1: return '\u2796';
    }
};

const translateNumberToFudgeRoll = function (number) {
    if (number === 0) {
        return getFudgeSymbol(number);
    }
    const numberForSymbol = number < 0 ? -1 : 1;
    let text = '';
    number = Math.abs(number);
    for (let i = 0; i < number; i++) {
        text += getFudgeSymbol(numberForSymbol);
    }
    return text;
};