const random = require('random');
const _ = require('underscore');

const MAX_ROLLS = 10;
const MAX_MUTIPLE_ROLLS = 25;
const MAX_MULTIPLY_ROLLS = 5;
const MAX_DICE_NUM = 100;
const DICE_NUM_SOFTCAP = 10;
const MAX_DIE_SIDES = 10000;
const MAX_REROLLS = 100;
const MAX_PARENTHESIS_LEVELS = 3;

const COMMAND_PART_SEPARATOR = ';';
const COMMENT_SEPARATOR = '?';
const APPEND_COMMENT_SEPARATOR = '?!';
const MULTIPLE_ROLLS_SEPARATOR = 'aoe';
const MULTIPLY_ROLL_SEPARATOR = '*';
const VERSUS_SEPARATOR = 'vs';
const VERSUS_VALUES_SEPARATOR = ',';

const DICE_REGEX = '(^\\d*d\\d+(>\\d+){0,1}$)';
const RNK_REGEX = '(^\\d+k\\d+(e\\d){0,1}$)';
const FUDGE_REGEX = '(^4df$)|(^fudge$)|(^f$)';

const ERROR_MESSAGE_START = '**ERROR:** ';

const TYPES = {
  static: 0, dice: 1, rnk: 2, fudge: 3
};

const FORMATTING = {
    bbCode: {
        boldStart: '[b]',
        boldEnd: '[/b]',
        italicsStart: '[i]',
        italicsEnd: '[/i]',
        listStart: '[ul]',
        listEnd: '[/ul]',
        listItemStart: '[li]',
        listItemEnd: '[/li]',
        codeStart: '',
        codeEnd: ''
    },
    markdown: {
        boldStart: '**',
        boldEnd: '**',
        italicsStart: '_',
        italicsEnd: '_',
        listStart: '',
        listEnd: '',
        listItemStart: ' * ',
        listItemEnd: '\n',
        codeStart: '`',
        codeEnd: '`'
    }
};

// The basic structure of a roll command is as follows:
// 1. The roll command as a whole
// 2. The roll command parts, defined by their separator (semicolon by default)
// 3. Each of them can have an optional commentary and a required roll expression
// 4. Roll expression can have optional behavior modifiers, such as multiple roll setting, vs value setting, etc.
// 5. This leaves us with roll formula, that can have parenthesis parts
// 6. Each of them then has roll parts, separated by mathematical signs

module.exports = args => {
    const preProcessingResult = preProcessRollCommand(args.commandText)
    if(preProcessingResult.error) {
        try {
            return args.message.reply(ERROR_MESSAGE_START + preProcessingResult.error);
        }
        catch (error) {
            console.error(error);
        }
    }

    const processingResult = processRollCommand(preProcessingResult);

    if(_.keys(processingResult).length === 0) {
        return args.message.reply(ERROR_MESSAGE_START + 'No roll formula found');
    }

    let responseMessage = '';
    _.each(_.keys(processingResult), (key) => {
        responseMessage += '\n';
        if(processingResult[key].error) {
            responseMessage += ERROR_MESSAGE_START + processingResult[key].error;
        }
        else {
            console.log(JSON.stringify(processingResult[key]));
            responseMessage += processingResult[key].prettifiedRollFormula + ' = ';
            if(processingResult[key].intermediateResultText &&
                processingResult[key].intermediateResultText !== processingResult[key].result.toString()) {
                responseMessage += processingResult[key].intermediateResultText + ' = ';
            }
            if(processingResult[key].resultText &&
                processingResult[key].resultText !== processingResult[key].result.toString() &&
                processingResult[key].intermediateResultText !== processingResult[key].resultText) {
                responseMessage += processingResult[key].resultText + ' = ';
            }
            responseMessage += processingResult[key].result;
        }
    });

    try {
        return args.message.reply(responseMessage);
    }
    catch (error) {
        console.error(error);
    }
};

// In here, we check the roll command for basic errors and return them if they are found
const preProcessRollCommand = function(command) {
    if(!command || command.trim().length === 0) {
        return { error: 'Roll command is empty' };
    }
    return command.trim();
};

// In here, we start processing the roll command by first separating it into command parts, defined by the separator
const processRollCommand = function(command) {
    let id = 0;
    let processedCommandParts = {};

    const commandParts = command.split(COMMAND_PART_SEPARATOR);
    // Now we check if all the parts are valid and leave those that aren't behind
    _.each(commandParts, (commandPart) => {
        if (commandPart && commandPart.trim().length > 0) {
            processedCommandParts[id] = processRollCommandPart({id, command: commandPart.trim()});
            if(!processedCommandParts[id]) {
                delete processedCommandParts[id];
            }
            else {
                id++;
            }
        }
    });

    return processedCommandParts;
};

// In here, we start by separating the roll expression from the comment
const processRollCommandPart = function(commandPart) {
    if(commandPart.command.indexOf(APPEND_COMMENT_SEPARATOR) !== -1) {
        commandPart = separateCommentFromRollExpression(commandPart, APPEND_COMMENT_SEPARATOR);
        commandPart.appendComment = true;
    }
    else if(commandPart.command.indexOf(COMMENT_SEPARATOR) !== -1) {
        commandPart = separateCommentFromRollExpression(commandPart, COMMENT_SEPARATOR);
    }
    if(commandPart.error) {
        return commandPart;
    }

    // Okay, now that we have our roll expression separated from the comment, let's first go over all the roll modifiers
    commandPart = processRollModifiers(commandPart);
    if(commandPart.error) {
        return commandPart;
    }

    if(!commandPart.rollFormula || commandPart.rollFormula.length === 0) {
        return null;
    }

    commandPart = processParentheses(commandPart);
    if(commandPart.error) {
        return commandPart;
    }

    commandPart = processRollStructure(commandPart);

    return commandPart;
};

const separateCommentFromRollExpression = function(commandPart, separator) {
    let commentAndRolLExpressionParts = commandPart.command.split(separator);
    // What if there is a comment separator, but there's nothing before it?
    if(commentAndRolLExpressionParts[0].trim().length === 0) {
        return { error: 'No roll expression specified', id: commandPart.id, command: commandPart.command };
    }
    // Also, we should just not add comment if there is nothing after the comment separator
    // No reason to stop executing the rest of the algorithm, though, so we won't throw an error
    if(commentAndRolLExpressionParts[1].trim().length > 0) {
        commandPart.command = commentAndRolLExpressionParts[0].trim();
        commandPart.comment = commentAndRolLExpressionParts[1].trim();
    }
    return commandPart;
};

// In here, we separate the roll formula from roll modifiers, we also process roll modifiers
const processRollModifiers = function(commandPart) {
    // Let's standardize the roll expression first by making it lowercase and removing all white-space characters
    commandPart.rollFormula = commandPart.command.toLowerCase().replace(/\s/g, '');

    if(commandPart.rollFormula.length === 0) {
        return { error: 'No roll expression specified', id: commandPart.id, command: commandPart.command };
    }

    commandPart = processVersusModifier(commandPart);
    if(commandPart.error) {
        return commandPart;
    }

    commandPart = processMultipleRollsModifier(commandPart);
    if(commandPart.error) {
        return commandPart;
    }

    return commandPart;
};

// We process the versus modifier here
const processVersusModifier = function(commandPart) {
    const tryToConvertUnrecognizedVersusTextToComment = function(text) {
        const nonCommaSeparatedDigitsRegex = new RegExp('([^-\\d' + VERSUS_VALUES_SEPARATOR + '])', 'g');
        if(text.search(nonCommaSeparatedDigitsRegex) !== -1) {
            // if it still has something other than digits, minuses, and commas, maybe it's a forgotten comment?
            // let's search the original string for it
            const indexOfOriginalVs = commandPart.command.toLowerCase().indexOf(VERSUS_SEPARATOR);
            const afterVsOriginalPart = commandPart.command.slice(indexOfOriginalVs + VERSUS_SEPARATOR.length);
            const nonCommaSeparatedSpacedDigitsRegex =
                new RegExp('([^-\\d\\s' + VERSUS_VALUES_SEPARATOR + '])', 'g');
            const indexOfMisplacedSymbols = afterVsOriginalPart.search(nonCommaSeparatedSpacedDigitsRegex);
            if(!commandPart.comment) {
                commandPart.comment = afterVsOriginalPart.slice(indexOfMisplacedSymbols);
                text =
                    afterVsOriginalPart.slice(0, indexOfMisplacedSymbols).toLowerCase().replace(/\s/g, '');
                // Note that this doesn't mean that everything that follows the versus separator is now correct
                // for sure, we still need to check for its validity
            }
            else {
                // if the comment was specified, then we're looking at a malformed command. Throw an error.
                return {
                    error: 'Couldn\'t parse the following expression: "' + afterVsOriginalPart +
                    '", symbol at position ' + (indexOfMisplacedSymbols + 1) +
                    ' is not recognized by the algorithm',
                    id: commandPart.id,
                    command: commandPart.command
                };
            }
        }

        return { commandPart, text };
    };

    let versusParts = attemptToFindRollModifier(commandPart, VERSUS_SEPARATOR);
    if(versusParts) {
        // Now let's see if there's anything besides digits, a minus sign, and commas in there. There shouldn't be.
        const nonCommaSeparatedNumbersRegex = new RegExp('([^-\\d' + VERSUS_VALUES_SEPARATOR + '])', 'g');
        if(versusParts[1].search(nonCommaSeparatedNumbersRegex) !== -1) {
            // Let's check if there's a misplaced multiple roll modifier
            const aoeRegex = new RegExp('(' + MULTIPLE_ROLLS_SEPARATOR + '\\d+)$', 'g');
            const aoeIndex = versusParts[1].search(aoeRegex);
            let aoeString = '';
            if(aoeIndex !== -1) {
                aoeString = versusParts[1].slice(aoeIndex + MULTIPLE_ROLLS_SEPARATOR.length);
                versusParts[1] = versusParts[1].slice(0, aoeIndex);

                const result = tryToConvertUnrecognizedVersusTextToComment(versusParts[1]);
                if(result.error) {
                    return result;
                }

                versusParts[0] += MULTIPLE_ROLLS_SEPARATOR + aoeString;
                versusParts[1] = result.text;
                commandPart = result.commandPart;
            }
            else {
                const result = tryToConvertUnrecognizedVersusTextToComment(versusParts[1]);
                if(result.error) {
                    return result;
                }

                versusParts[1] = result.text;
                commandPart = result.commandPart;
            }
        }

        let error = null;
        // We'll just ignore the versus separator if there is nothing after it
        if(versusParts[1].length > 0) {
            commandPart.versusValues = [];
            _.every(versusParts[1].split(VERSUS_VALUES_SEPARATOR), (versusValue) => {
                // Again, we ignore empty parts
                if(versusValue.length) {
                    // And parts that are somehow still non-numeric
                    if(!isNaN(versusValue)) {
                        commandPart.versusValues.push(Number(versusValue));
                    }
                    else {
                        error =  {
                            error: 'Couldn\'t parse versus value "' + versusValue + '"',
                            id: commandPart.id,
                            command: commandPart.command
                        };
                        return false;
                    }
                }
                return true;
            });
        }
        if(error) {
            return error;
        }

        commandPart.rollFormula = versusParts[0];
    }

    return commandPart;
};

// And the multiple rolls modifier in here
const processMultipleRollsModifier = function(commandPart) {
    let aoeParts = attemptToFindRollModifier(commandPart, MULTIPLE_ROLLS_SEPARATOR);
    if(aoeParts) {
        // Nothing specified as the actual number? Ignore it, then
        if(aoeParts[1].length === 0) {
            return commandPart;
        }
        // The only thing after the aoe modifier should be the one single number. If that's not the case, we might
        // have a message with a forgotten comment separator
        if(isNaN(aoeParts[1])) {
            const indexOfFirstNonDigit = commandPart.command.search(/([^\d])/g);
            if(!commandPart.comment) {
                commandPart.comment = commandPart.command.slice(indexOfFirstNonDigit);
                aoeParts[1] = aoeParts[1].slice(0, indexOfFirstNonDigit);
            }
            else { // If comment is already specified, let's throw an error
                return {
                    error: 'Couldn\'t parse the following expression: "' +
                    commandPart.command.slice(indexOfFirstNonDigit) + '", symbol at position ' +
                    (indexOfFirstNonDigit + 1) + ' is not recognized by the algorithm',
                    command: commandPart.command,
                    id: commandPart.id
                }
            }

        }

        commandPart.rollFormula = aoeParts[0];
        commandPart.multipleRollsNumber = Number(aoeParts[1]);
    }

    return commandPart;
};

const attemptToFindRollModifier = function(commandPart, separator) {
    let modifierParts = null;
    // We start by attempting to find the modifier
    if(commandPart.rollFormula.indexOf(separator) !== -1) {
        modifierParts = commandPart.rollFormula.split(separator);
        if (modifierParts.length > 2) {
            // Possibly the user forgot to put a comment separator before writing a comment, so we found it there?
            // For now, let's merge the rest of the parts into the second one, we'll figure it out later
            let newModifierParts = [modifierParts[0], ''];
            _.each(modifierParts, (modifierPart, i) => {
                if (i > 0) {
                    newModifierParts[1] += modifierPart;
                }
            });
            modifierParts = newModifierParts;
        }
    }
    return modifierParts;
};

// In here, we go over the parentheses and create a nesting structure out of the string with them
const processParentheses = function(commandPart) {
    let rollStructure = { children: { '0': { } } };

    const processParenthesisPart = function(part, path) {
        let structure = rollStructure;
        if(path) {
            let error = null;
            _.every(path.split(':'), (pathPart, i) => {
                if(i >= MAX_PARENTHESIS_LEVELS) {
                    error = {
                        error: 'The maximum level of parenthesis nesting is ' + MAX_PARENTHESIS_LEVELS,
                        id: commandPart.id,
                        command: commandPart.command
                    };
                    return false;
                }
                structure = structure.children[pathPart];
                return true;
            });
            if(error) {
                return error;
            }
        }

        if(part.indexOf('(') === -1 && part.indexOf(')') === -1) {
            // Phew, no parentheses at all. We can just return the whole roll formula.
            structure.rollFormula = part;
            return;
        }
        const openingParentheses = part.match(/\(/g) || [];
        const closingParentheses = part.match(/\)/g) || [];
        // Let's check if we have the same number of opening parentheses as the number of closing ones
        if(openingParentheses.length !== closingParentheses.length) {
            return {
                error: 'The number of opening parenthesis doesn\'t match the number of closing ones.',
                id: commandPart.id,
                command: commandPart.command
            };
        }

        structure.children = { };
        const children = part.match(/(?<=\()(?:[^()]+|\([^)]+\))+/g);
        _.each(children, (child, i) => {
            structure.children[i] = { };
            processParenthesisPart(child, path + ':' + i);
        });
        let i = 0;
        structure.rollFormula = part.replace(/(?<=\()(?:[^()]+|\([^)]+\))+/g, () => { return i++; });
    }

    const result = processParenthesisPart(commandPart.rollFormula, '0');
    if(result && result.error) {
        return result;
    }
    commandPart.rollStructure = rollStructure.children[0];

    return commandPart;
};

const processRollStructure = function(commandPart) {
    const format = 'markdown';
    let currentSign = '';
    let modifiersSum = 0;
    const processOperation = function(structure, processingResult) {
        if(processingResult.type === TYPES.static) {
            if(!currentSign) {
                modifiersSum = processingResult.result;
            }
            else if(currentSign === '+') {
                modifiersSum += processingResult.result;
            }
            else if(currentSign === '-') {
                modifiersSum -= processingResult.result;
            }
        }
        else {
            if (!currentSign) {
                structure.result = processingResult.result;
            }
            else if (currentSign === '+') {
                structure.result += processingResult.result;
                if(structure.intermediateResultText) {
                    structure.intermediateResultText += ' + ';
                }
                if(structure.resultText) {
                    structure.resultText += ' + ';
                }
            }
            else if (currentSign === '-') {
                structure.result -= processingResult.result;
                if(structure.intermediateResultText) {
                    structure.intermediateResultText += ' - ';
                }
                else {
                    structure.intermediateResultText += '-';
                }
                if(structure.resultText) {
                    structure.resultText += ' - ';
                }
                else {
                    structure.resultText += '-';
                }
            }
            structure.intermediateResultText += processingResult.intermediateResultText;
            structure.resultText += processingResult.resultText;
            currentSign = '';
        }
    };
    const processFormulaPart = function(structure, formulaPart, currentIndex, totalPartsNumber) {
        if(formulaPart) {
            let currentFormulaPart = formulaPart;
            if (currentFormulaPart.startsWith('(') && currentFormulaPart.endsWith(')')) {
                const child = structure.children[formulaPart.slice(1, -1)];
                currentFormulaPart = '(' + child.prettifiedRollFormula + ')';
                processOperation(structure, child.result);
                currentSign = '';
            }
            else if (isNaN(currentFormulaPart)) {
                // Either a roll, a sign, or... something else?
                if (currentFormulaPart === '+') {
                    currentSign = currentSign || '+';
                }
                else if(currentFormulaPart === '-') {
                    currentSign = (currentSign === '-') ? '+' : '-';
                }
                else if(currentFormulaPart.match(new RegExp(DICE_REGEX))) {
                    const diceResult = processDiceFormula(currentFormulaPart, format);
                    if(diceResult.error) {
                        return diceResult.error;
                    }
                    processOperation(structure, diceResult);
                }
                else if(currentFormulaPart.match(new RegExp(RNK_REGEX))) {

                }
                else if(currentFormulaPart.match(new RegExp(FUDGE_REGEX))) {

                }
                else {
                    // Maybe it's a comment?
                    const deSpacedCommandString = commandPart.command.replace(/\s/g, '');
                    const indexOfPart = deSpacedCommandString.indexOf(currentFormulaPart);
                    let whiteSpaceCharactersNumber = 0;
                    let currentIndex = 0;
                    while(currentIndex < indexOfPart) {
                        if(commandPart.command[currentIndex + whiteSpaceCharactersNumber].match(/\s/g)) {
                            whiteSpaceCharactersNumber++;
                        }
                        else {
                            currentIndex++;
                        }
                    }
                    if(indexOfPart === -1) {
                        return 'Couldn\'t process "' + currentFormulaPart + '"';
                    }

                    let newComment = commandPart.command.slice(indexOfPart + whiteSpaceCharactersNumber).trim();
                    // Hey, maybe we can recover anything?
                    const indexOfFirstWhiteSpace = newComment.search(/\s/g);
                    if(indexOfFirstWhiteSpace !== -1) {
                        const error = processFormulaPart(structure, newComment.slice(0, indexOfFirstWhiteSpace),
                            currentIndex, totalPartsNumber);
                        if(error) {
                            return error;
                        }
                        newComment = newComment.slice(indexOfFirstWhiteSpace).trim();
                    }

                    if(!commandPart.comment) {
                        commandPart.comment = newComment;
                        return;
                    }
                    else {
                        return 'Couldn\'t process "' + newComment + '"';
                    }
                }
            }
            else {
                // We're looking at a number
                processOperation(structure, { type: TYPES.static, result: Number(currentFormulaPart) });
            }
            structure.prettifiedRollFormula += currentFormulaPart;
            if (currentIndex < totalPartsNumber - 1 && (currentFormulaPart !== '-' || currentIndex === 0)) {
                structure.prettifiedRollFormula += ' ';
            }
        }
    };
    const processChildren = function(structure) {
        let error = null;
        if(structure.children && _.keys(structure.children).length) {
            _.every(_.keys(structure.children), (childKey) => {
                const err = processChildren(structure.children[childKey]);
                if(err) {
                    error = err;
                    return false;
                }
                return true;
            });
            if(error) {
                return error;
            }
        }
        const formulaParts = structure.rollFormula.split(/([+-])/g);

        structure.prettifiedRollFormula = '';
        structure.intermediateResultText = '';
        structure.resultText = '';
        structure.result = 0;

        _.every(formulaParts, (formulaPart, i) => {
            const err = processFormulaPart(structure, formulaPart, i, formulaParts.length);
            if(err) {
                error = err;
            }
            return true;
        });

        return error;
    };

    const error = processChildren(commandPart.rollStructure);
    if(error) {
        return { error, id: commandPart.id, command: commandPart.command };
    }

    if(modifiersSum !== 0) {
        let modifiersSumText = '';
        if(modifiersSum < 0) {
            modifiersSumText = ' - ';
        }
        else {
            modifiersSumText = ' + ';
        }
        modifiersSumText += FORMATTING[format].italicsStart + modifiersSum + FORMATTING[format].italicsEnd;
        commandPart.rollStructure.intermediateResultText += modifiersSumText;
        commandPart.rollStructure.resultText += modifiersSumText;
        commandPart.rollStructure.result += modifiersSum;
    }

    commandPart.prettifiedRollFormula = commandPart.rollStructure.prettifiedRollFormula;
    commandPart.intermediateResultText = commandPart.rollStructure.intermediateResultText;
    commandPart.resultText = commandPart.rollStructure.resultText;
    commandPart.result = commandPart.rollStructure.result;

    return commandPart;
};

const processDiceFormula = function(formula, format) {
    const diceParts = formula.split('d');
    if(isNaN(diceParts[0])) {
        return {
            error: '"' + diceParts[0] + '" in "' + formula + '" is not a valid number'
        };
    }
    if(isNaN(diceParts[1])) {
        return {
            error: '"' + diceParts[1] + '" in "' + formula + '" is not a valid number'
        };
    }
    const diceNum = Number(diceParts[0]);
    const dieSides = Number(diceParts[1]);

    if(diceNum > MAX_DICE_NUM) {
        return {
            error: 'The requested number of dice rolls in "' + formula +
            '" is higher than the maximum allowed number of ' + MAX_DICE_NUM
        };
    }
    if(dieSides > MAX_DIE_SIDES) {
        return {
            error: 'The requested number of die sides in "' + formula +
            '" is higher than the maximum allowed number of ' + MAX_DIE_SIDES
        };
    }

    let result = 0;
    let results = [];
    let intermediateResultText = '';

    for(let i = 0; i < diceNum; i++) {
        const currentResult = roll(dieSides);
        results.push(currentResult);
        result += currentResult;
        if(i > 0) {
            if(diceNum <= DICE_NUM_SOFTCAP || i === 1 || i === diceNum - 1) {
                intermediateResultText += ' + ';
            }
        }
        if(diceNum <= DICE_NUM_SOFTCAP || i === 0 || i === diceNum - 1) {
            if (currentResult === dieSides) {
                intermediateResultText += FORMATTING[format].boldStart + currentResult + FORMATTING[format].boldEnd;
            }
            else {
                intermediateResultText += currentResult;
            }
        }
        else if(diceNum > DICE_NUM_SOFTCAP && i === 2) {
            intermediateResultText += '...';
        }
    }

    if(diceNum > 1 && dieSides > 0) {
        intermediateResultText = '(' + intermediateResultText + ')';
    }

    let resultText = result.toString();
    if(diceNum === 1 && dieSides > 1 && result === dieSides) {
        resultText = FORMATTING[format].boldStart + resultText + FORMATTING[format].boldEnd;
    }

    return {
        type: TYPES.dice,
        diceNum,
        dieSides,
        results,
        result
    }
};

const roll = function(dieSides) {
    if(dieSides === 0) {
        return 0;
    }
    return random.integer(1, dieSides);
};