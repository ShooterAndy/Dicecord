const random = require('random');
const _ = require('underscore');

const maxRolls = 10;
const maxMultipleRolls = 25;
const maxMultiplyRolls = 5;
const maxDiceNum = 100;
const maxDieSides = 10000;
const maxRerolls = 100;

module.exports = args => {
    const separatedRollMessages = args.commandText.split(';');
    let rollMessages = [];
    _.each(separatedRollMessages, (rollMessage) => {
        const rollMessageParts = rollMessage.split('=>');
        _.each(rollMessageParts, (rollMessagePart, i) => {
            if(i > 0) {
                rollMessages.push({ message: rollMessagePart, onSuccess: true });
            }
            else {
                rollMessages.push({ message: rollMessagePart, onSuccess: false });
            }
        });
    });
    if(!rollMessages || !rollMessages.length ||
        (rollMessages.length === 1 && rollMessages[0].message.trim() === '')) {
        return args.message.reply('**ERROR:** No dice specified, please input something like:\n`' + args.prefix +
            'roll 1d6+2`, or check out `' + args.prefix + 'help roll` for more info.');
    }
    if(rollMessages.length > maxRolls) {
        return args.message.reply('**ERROR:** No more than ' + maxRolls +
            ' rolls are allowed per one command, please put them into several separate commands.');
    }
    processRollMessages(args.message, rollMessages);
};

const processRollMessages = function (message, rollMessages) {
    let replyText = '';
    if (!rollMessages) {
        replyText = 'No roll';
    }
    else {
        let previousSuccess = true;
        let previousAoE = false;
        for (let i = 0; i < rollMessages.length; i++) {
            const rollResults = processRoll(rollMessages[i].message);
            if(previousSuccess || !rollMessages[i].onSuccess) {
                if(rollResults && rollResults.text) {
                    if(i !== 0) {
                        if(rollMessages[i].onSuccess && !previousAoE) {
                            replyText += ', ';
                        }
                        else {
                            if(i <= rollMessages.length - 1) {
                                replyText += ';\n';
                            }
                        }
                    }
                    else {
                        replyText += '\n';
                    }
                    replyText += rollResults.text;
                    previousSuccess = rollResults.success;
                    previousAoE = rollResults.isAoE;
                    if(i === rollMessages.length - 1) {
                        replyText += '.';
                    }
                }
                else {
                    if(rollResults) {
                        replyText += '**ERROR:** ' + rollResults + '.';
                    }
                    else if(rollMessages[i].message.trim() !== '') {
                        replyText += '**ERROR:** Roll part is invalid: "' + rollMessages[i].message + '"';
                    }
                }
            }
            else {
                if(i === rollMessages.length - 1) {
                    replyText += '.';
                }
                else {
                    replyText += ';\n';
                }
            }
        }
    }

    if (!replyText) {
        return;
    }

    return message.reply(replyText).catch(console.error);
};

const getNumberAfterParameterAndCleanString = function(string, parameter) {
    let numberString = '';
    let index = string.indexOf(parameter);
    let stringAfterParameter = '';
    if(index > 0) {
        stringAfterParameter = string.slice(index + parameter.length).trim();
        let i = 0;
        while (!isNaN(stringAfterParameter[i]) || stringAfterParameter[i] === ' ') {
            if(stringAfterParameter[i] !== ' ') {
                numberString += stringAfterParameter[i];
            }
            i++;
        }
        let cleanedString = string;
        if (i > 0) {
            cleanedString = string.slice(0, index).trim() + stringAfterParameter.slice(i).trim();
        }
        return { number: parseInt(numberString), cleanedString: cleanedString };
    }
    else {
        return null;
    }
};

const processRoll = function(roll) {
    // First of all, let's get a comment for the roll, if it exists
    let comment = '';
    let prependComment = true;
    let indexOfCommentSymbol = roll.indexOf('?');
    if (indexOfCommentSymbol > 0) {
        comment = roll.slice(indexOfCommentSymbol + 1);
        if(comment.startsWith('!')) {
            prependComment = false;
            comment = comment.slice(1);
        }
        comment = comment.trim();
        roll = roll.slice(0, indexOfCommentSymbol);
    }

    // Now that we've removed any readable text for the comment, time to standartize the roll string by
    // making it lowercase and replacing any and all whitespace symbols with a simple space
    roll = roll.toLowerCase();
    roll = roll.replace(/\s/g, ' ');
    roll = roll.replace(/[{}]/g, '');

    // Now let's check for a versus part (it can have multiple comma-separated values)
    let success = true; // we assume success just in case
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
                    vsTextPart = vsTextPart.trim();
                    if(!isNaN(vsTextPart)) {
                        vsValues.push(parseInt(vsTextPart));
                    }
                    else {
                        const indexOfSpace = vsTextPart.indexOf(' ');
                        if(indexOfSpace !== -1) {
                            // We have a space in the middle of our vs part. This is strange and might mean the user
                            // forgot to add a comment-start symbol before typing a comment. Let's assume only the
                            // first part is relevant to us.
                            let ignoredText = vsTextPart.slice(indexOfSpace).trim();
                            let clippedVsTextPart = vsTextPart.slice(0, indexOfSpace);
                            if(!isNaN(clippedVsTextPart)) {
                                vsValues.push(parseInt(clippedVsTextPart));
                                if(!comment.length) {
                                    comment = ignoredText;
                                    prependComment = false;
                                }
                                else {
                                    return '"versus" value "' + vsTextPart + '" is not a number';
                                }
                            }
                            else {
                                return '"versus" value "' + vsTextPart + '" is not a number';
                            }
                        }
                        return '"versus" value "' + vsTextPart + '" is not a number';
                    }
                });
            }
            else {
                return '"versus" part is incomplete';
            }
        }
        else {
            return '"versus" part is empty';
        }
    }
    if(vsValues.length) {
        success = false; // now the success actually needs to be earned
    }

    // Now let's see if we're dealing with an "AoE" roll (rolls the same thing multiple times, but doesn't add the
    // results)
    let aoeNumber = 0;
    let res = getNumberAfterParameterAndCleanString(roll, 'aoe');
    if(res && res.number && !isNaN(res.number)) {
        aoeNumber = res.number;
        roll = res.cleanedString;
    }
    else { // Let's check for a synonym
        res = getNumberAfterParameterAndCleanString(roll, 'x');
        if(res && res.number && !isNaN(res.number)) {
            aoeNumber = res.number;
            roll = res.cleanedString;
        }
    }
    if(aoeNumber > maxMultipleRolls) {
        return 'the number of rolls specified (' + aoeNumber + ') is too high, no more than ' +
            maxMultipleRolls + ' are allowed.';
    }

    if(aoeNumber < vsValues.length) {
        //We assume the roller wants as many rolls as the versus-checks requested
        aoeNumber = vsValues.length;
    }
    // Now let's see if we're dealing with a roll  that rolls the same thing multiple times and sums the results up
    let multiplyNumber = 0;
    res = getNumberAfterParameterAndCleanString(roll, '*');
    if(res && res.number && !isNaN(res.number)) {
        multiplyNumber = res.number;
        roll = res.cleanedString;
    }
    if(multiplyNumber > maxMultiplyRolls) {
        return 'the multiplication specified (' + multiplyNumber + ') is too high, no more than ' +
            maxMultiplyRolls + ' are allowed.';
    }

    // Let's check for parentheses
    let parenthesisParts = {};
    let currentPath = [];
    let transformedText = '';

    const getPartFromPath = function(path) {
        if(!path || !path.length) {
            return null;
        }
        let part = parenthesisParts[path[0]];
        if(path.length > 1) {
            for (let i = 1; i < path.length; i++) {
                part = part.children[path[i]];
            }
        }
        return part;
    };

    for(let i = 0; i < roll.length; i++) {
        if(roll[i] === '(') {
            let currentPart = getPartFromPath(currentPath);
            let newChildPart = { text: '', children: {} };
            if(!currentPart) {
                if(_.keys(parenthesisParts).length > 5) {
                    return 'too many parenthesis parts';
                }
                let newName = 'pp' + _.keys(parenthesisParts).length;
                parenthesisParts[newName] = newChildPart;
                currentPath.push(newName);
            }
            else {
                if(_.keys(currentPart.children).length > 5) {
                    return 'too many parenthesis parts';
                }
                let newName = currentPath[currentPath.length - 1] + '_' + _.keys(currentPart.children).length;
                currentPart.children[newName] = newChildPart;
                currentPath.push(newName);
            }
            if(currentPath.length > 5) {
                return 'too many parenthesis levels';
            }
        }
        else if(roll[i] === ')') {
            if(currentPath.length > 0) {
                let currentPartName = currentPath[currentPath.length - 1];
                currentPath.pop();
                if(currentPath.length) {
                    getPartFromPath(currentPath).text += '{' + currentPartName + '}';
                }
                else {
                    transformedText += '{' + currentPartName + '}';
                }
            }
            else {
                return 'found a closing parenthesis without a previous opening one.'
            }
        }
        else {
            if(currentPath.length) {
                getPartFromPath(currentPath).text += roll[i];
            }
            else {
                transformedText += roll[i];
            }
        }
    }

    const getParenthesisPartByName = function(name) {
        const cycleThroughParenthesisParts = function(currentParts) {
            let part = null;
            _.every(_.keys(currentParts), (parenthesisPartName) => {
                if(parenthesisPartName === name) {
                    part = currentParts[parenthesisPartName];
                    return false;
                }
                part = cycleThroughParenthesisParts(currentParts[parenthesisPartName].children);
                return true;
            });
            return part;
        };
        return cycleThroughParenthesisParts(parenthesisParts);
    };

    let results = [];

    const processParenthesisPartText = function (parenthesisPartText, isNegative) {
        let nextPartIsNegative = false;
        if(isNegative === undefined) {
            isNegative = nextPartIsNegative;
        }
        // First, let's process the mathematical signs and merge the redundant ones
        let currentSign = null;
        let fixedParenthesisPartText = '';
        _.each(parenthesisPartText.split(/(\+|-)/g), (splitPart, i) => {
            if(splitPart === '+') {
                if(!currentSign) {
                    currentSign = '+';
                }
            }
            else if(splitPart === '-') {
                currentSign = '-';
            }
            else if(splitPart !== '') {
                if(i === 1) {
                    if(currentSign === '-') {
                        fixedParenthesisPartText = '-' + splitPart;
                    }
                    else {
                        fixedParenthesisPartText = splitPart;
                    }
                }
                else {
                    if(currentSign) {
                        fixedParenthesisPartText += currentSign + splitPart;
                    }
                    else {
                        fixedParenthesisPartText = splitPart;
                    }
                }
                currentSign = null;
            }
        });

        // Second, we look for other parenthesis parts that are marked as {NAME}
        let currentParenthesisPartName = '';
        let partType = null;
        let formattedText = '';
        let currentPartText = '';
        let error = '';

        const getPartResultsIfNeeded = function() {
            let rollPartResult = null;
            if(partType === null && currentPartText !== '') { // not a special type
                rollPartResult = processRollPart(currentPartText);
                currentPartText = '';
            }
            if(rollPartResult) {
                rollPartResult.isNegative = isNegative ? !nextPartIsNegative : nextPartIsNegative;
                if(rollPartResult.ignoredText && rollPartResult.ignoredText.length) {
                    if (!comment.length) {
                        prependComment = false;
                        comment = rollPartResult.ignoredText;
                    }
                    else {
                        rollPartResult =
                            { type: 'error', text: 'Couldn\'t process "' + rollPartResult.ignoredText + '"' };
                    }
                }
                results.push(rollPartResult);
                nextPartIsNegative = false;
                if(rollPartResult.type !== 'error') {
                    formattedText += rollPartResult.text;
                }
            }
        };

        _.every(fixedParenthesisPartText, (symbol, i) => {
            if(symbol === '{') {
                getPartResultsIfNeeded('parenthesisPart');
                partType = 'parenthesisPart';
            }
            else if(symbol === '}') {
                getPartResultsIfNeeded();
                if(!getParenthesisPartByName(currentParenthesisPartName)) {
                    console.error('ERROR:' + currentParenthesisPartName);
                }
                formattedText += '(' +
                    processParenthesisPartText(getParenthesisPartByName(currentParenthesisPartName).text,
                        nextPartIsNegative) + ')';
                currentParenthesisPartName = '';
                partType = null;
            }
            else if(symbol === '+') {
                getPartResultsIfNeeded();
                formattedText += ' + ';
            }
            else if(symbol === '-') {
                getPartResultsIfNeeded();
                nextPartIsNegative = !nextPartIsNegative;
                if(i === 0) {
                    formattedText += '-';
                }
                else {
                    formattedText += ' - ';
                }
            }
            else {
                if(partType === 'parenthesisPart') {
                    currentParenthesisPartName += symbol;
                }
                else {
                    //formattedText += symbol;
                    currentPartText += symbol;
                    partType = null;
                }
            }
            return true;
        });

        // Last check for any remaining symbols
        getPartResultsIfNeeded();

        return error || formattedText;
    };

    const processParenthesisParts = function (aoeRollNumber) {
        let text = processParenthesisPartText(transformedText).replace(/\s\s+/g, ' ');

        if(multiplyNumber > 1) {
            text = '(' + text + ') * ' + multiplyNumber;

            const originalResults = JSON.parse(JSON.stringify(results));
            for(let i = 0; i < multiplyNumber - 1; i++) {
                _.each(originalResults, (result) => {
                    results.push(processRollPart(result.text));
                });
            }
        }

        let erroredResults = _.filter(results, { type: 'error' });
        if(erroredResults.length) {
            let errorsText = '';
            _.each(erroredResults, (erroredResult) => {
                if(!errorsText.length) {
                    errorsText = '**ERROR:** ' + erroredResult.text;
                }
                else {
                    errorsText += '; ' + erroredResult.text
                }
            });
            return errorsText;
        }

        // First, let's combine bonuses
        let bonusResultsNum = 0;
        let bonusesTotal = 0;
        _.each(results, (result) => {
            if(result.type !== 'error') {
                if (result.type === 'bonus') {
                    bonusResultsNum++;
                    if (result.isNegative) {
                        bonusesTotal -= result.value;
                    }
                    else {
                        bonusesTotal += result.value;
                    }
                }
            }
        });

        let middleText = '';
        let finalResult = 0;
        let nonBonusResultsNum = 0;
        _.each(results, (result, i) => {
            if(result.type !== 'bonus' && result.type !== 'error') { // we've already combined the bonuses, let's exclude them
                nonBonusResultsNum++;
                if (result.isNegative) {
                    if (i === 0) {
                        middleText += '-';
                    }
                    else {
                        middleText += ' - ';
                    }
                    finalResult -= result.value;
                }
                else {
                    if (i !== 0) {
                        middleText += ' + ';
                    }
                    finalResult += result.value;
                }
                if(result.value === result.maxResult) {
                    middleText += '**' + result.resultText + '**';
                }
                else {
                    middleText += result.resultText;
                }
            }
        });

        if(bonusesTotal !== 0) {
            if(nonBonusResultsNum === 0) {
                if(bonusResultsNum > 1) {
                    middleText = (bonusesTotal < 0 ? '-' : '') + '_' + Math.abs(bonusesTotal) + '_';
                }
            }
            else {
                middleText += (bonusesTotal < 0 ? ' - ' : ' + ') + '_' + Math.abs(bonusesTotal) + '_';
            }
            finalResult += bonusesTotal;
        }

        let finalText = '';

        if(aoeNumber > 1) {
            if (aoeRollNumber === 0) {
                if(comment) {
                    finalText += '`' + comment + ':` ';
                }
                finalText += text + ' (' + aoeNumber + ' rolls):\n';
            }
        }

        const addVsValueResult = function() {
            if(vsValues.length) {
                let vsValue = null;
                if(aoeNumber > 1) {
                    if(vsValues[aoeRollNumber]) {
                        vsValue = vsValues[aoeRollNumber];
                    }
                    else if (vsValues.length === 1) { // Assume it's the same for all rolls
                        vsValue = vsValues[0];
                    }
                }
                else {
                    vsValue = vsValues[0];
                }
                if(vsValue !== null) {
                    finalText += ' vs ' + vsValue + ', ' + (finalResult >= vsValue ? '**success**' : '_failure_');
                    success = success || (finalResult >= vsValue);
                }
            }
        };

        if(nonBonusResultsNum === 0) {
            if(aoeNumber > 1) {
                finalText += ' * Roll ' + (aoeRollNumber + 1) + ': ';
                finalText += '**' + finalResult + '**';
                addVsValueResult();
                if(aoeRollNumber < aoeNumber - 1) {
                    finalText += ';\n';
                }
            }
            else {
                if(bonusResultsNum > 1) {
                    finalText += text + '  =  **' + finalResult + '**';
                }
                else {
                    finalText += '**' + finalResult + '**';
                }
                addVsValueResult();
            }
        }
        else {
            if(aoeNumber > 1) {
                finalText += ' * Roll ' + (aoeRollNumber + 1) + ': ';
                if (nonBonusResultsNum > 1 || bonusesTotal !== 0) {
                    finalText += middleText + '  =  **' + finalResult + '**';
                }
                else {
                    finalText += '**' + finalResult + '**';
                }
                addVsValueResult();
                if(aoeRollNumber < aoeNumber - 1) {
                    finalText += ';\n';
                }
            }
            else {
                if (nonBonusResultsNum > 1 || bonusesTotal !== 0) {
                    finalText += text + '  =  ' + middleText + '  =  **' + finalResult + '**';
                }
                else {
                    finalText += text + '  =  **' + finalResult + '**';
                }
                addVsValueResult();
            }
        }

        if(comment && aoeNumber <= 1) {
            if(prependComment) {
                finalText = '`' + comment + ':` ' + finalText;
            }
            else {
                finalText = finalText + ' `' + comment + '`';
            }
        }

        return finalText;
    };

    let finalTextForAllRolls = '';
    if(aoeNumber) {
        for (let i = 0; i < aoeNumber; i++) {
            results = [];
            //nextPartIsNegative = false;
            finalTextForAllRolls += processParenthesisParts(i);
        }
    }
    else {
        finalTextForAllRolls = processParenthesisParts();
    }

    return { text: finalTextForAllRolls, success: success, isAoE: (aoeNumber > 1) };
};

const processRollPart = function (rollPart, isNegative) {
    rollPart = rollPart.trim();
    const indexOfSpace = rollPart.indexOf(' ');
    let ignoredText = '';
    if(indexOfSpace !== -1) {
        // We have a space in the middle of our roll part. This is strange and might mean the user forgot to add a
        // comment-start symbol before typing a comment. Let's assume only the first part is relevant to us
        ignoredText = rollPart.slice(indexOfSpace).trim();
        rollPart = rollPart.slice(0, indexOfSpace);
    }
    if (isNaN(rollPart)) {
        // Test for rerolls
        let brutalDie = null;
        const res = getNumberAfterParameterAndCleanString(rollPart, '>');
        if(res && res.number && !isNaN(res.number)) {
            brutalDie = res.number;
            rollPart = res.cleanedString;
        }

        let rollFunction = null;
        let explodeOn = 10;

        // Test for roll'n'keep die
        if (rollPart.indexOf('k') > 0) {
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
                rollFunction = processRnKDie;
            }
        }
        // Test for normal die
        const regexedDie = rollPart.match(/\d{0,2}([dD])\d{1,4}/);
        if (regexedDie && (regexedDie.length > 0)) {
            rollFunction = processDie;
        }
        // Test for fudge die
        if ((rollPart.toLowerCase().trim() === 'f') || (rollPart.toLowerCase().trim() === '4df') ||
            (rollPart.toLowerCase().trim() === 'fudge')) {
            rollFunction = processFudgeDie;
        }

        if(!rollFunction) {
            return {
                type: 'error',
                text: 'Couldn\'t parse "' + rollPart + '"'
            };
        }

        let rollFinalResult = null;

        if(brutalDie !== null) {
            let rollResult = rollFunction(rollPart, isNegative, explodeOn);
            if(rollResult.maxResult !== undefined && rollResult.maxResult < brutalDie) {
                return {
                    type: 'error',
                    text: rollPart + ' has higher requested re-roll than possible'
                };
            }
            else {
                let counter = 0;
                rollFinalResult = JSON.parse(JSON.stringify(rollResult));
                if(rollFinalResult.type !== 'error') {
                    rollFinalResult.resultText = '';
                    while (rollResult.value < brutalDie && counter < maxRerolls) {
                        rollFinalResult.resultText += '~~' + rollResult.resultText + '~~, ';
                        rollResult = rollFunction(rollPart, isNegative, explodeOn);
                        counter++;
                    }
                    if (counter === maxRerolls) {
                        rollFinalResult = {
                            type: 'error',
                            text: rollPart + ' produced more than ' + maxRerolls + ' re-rolls'
                        };
                    }
                    else {
                        rollFinalResult.value = rollResult.value;
                        rollFinalResult.resultText += rollResult.resultText;
                        rollFinalResult.doWeNeedIntermediateResult = rollFinalResult.doWeNeedIntermediateResult ||
                            (counter >= 1);
                    }
                }
            }
        }
        else {
            rollFinalResult = rollFunction(rollPart, isNegative, explodeOn);
        }

        rollFinalResult.ignoredText = ignoredText;
        return rollFinalResult;
    }
    else {
        return {
            type: 'bonus',
            isNegative: isNegative,
            text: rollPart,
            value: parseInt(rollPart),
            ignoredText: ignoredText
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

    if(diceNum > maxDiceNum) {
        return {
            type: 'error',
            text: 'No more than ' + maxDiceNum + ' dice allowed per one roll, you requested "' + text + '"'
        };
    }
    if(dieSidesNum > maxDieSides) {
        return {
            type: 'error',
            text: 'No more than ' + maxDieSides + '-sided dice allowed, you requested "' + text + '"'
        };
    }
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
        doWeNeedIntermediateResult: doWeNeedIntermediateResult,
        maxResult: diceNum * dieSidesNum
    };
};

const processRnKDie = function (die, isNegative, explodeOn) {
    die = die.toLowerCase().split('k');
    const diceNum = die[0] === '' ? 1 : parseInt(die[0]);
    const diceKeepNum = parseInt(die[1]);
    const text = diceNum + 'k' + diceKeepNum;
    if(diceNum > maxDiceNum) {
        return {
            type: 'error',
            text: 'No more than ' + maxDiceNum + ' dice allowed per one roll, you requested "' + text + '"'
        };
    }
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
        doWeNeedIntermediateResult: true,
        maxResult: diceNum * 10
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
        doWeNeedIntermediateResult: true,
        maxResult: 4
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