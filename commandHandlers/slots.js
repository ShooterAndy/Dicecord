const random = require('random')
const {
  DEFAULT_SLOTS_NUMBER, DEFAULT_SLOTS_SYMBOLS, MINIMUM_SLOTS_NUMBER, MAXIMUM_SLOTS_NUMBER,
  MINIMUM_SLOTS_SYMBOLS, MAXIMUM_SLOTS_SYMBOLS
} = require('../helpers/constants')
const nws = require('../helpers/nws')
const logger = require('../helpers/logger')
const errorEmbed = require('../helpers/errorEmbed')
const commonReplyEmbed = require('../helpers/commonReplyEmbed')

module.exports = async (interaction, args) => {
  let { slotsNumber, slotsText } = args
  if (slotsNumber === null || slotsNumber === undefined) {
    slotsNumber = DEFAULT_SLOTS_NUMBER
  }


  if (slotsNumber < MINIMUM_SLOTS_NUMBER) {
    return await interaction.reply(errorEmbed.get(nws`Please set the number of slots to more \
      than ${MINIMUM_SLOTS_NUMBER - 1}.`))
  }
  if (slotsNumber > MAXIMUM_SLOTS_NUMBER) {
    return await interaction.reply(errorEmbed.get(nws`Please set the number of slots to fewer \
      than ${MAXIMUM_SLOTS_NUMBER + 1}.`))
  }

  let slots = []
  if (!slotsText || !slotsText.trim()) {
    slots = DEFAULT_SLOTS_SYMBOLS
  } else {
    slotsText = slotsText.replace(/\s/g, ',').replace(/,+/g, ',')
    let slotsParts = slotsText.split(',')
    if (!slotsParts || slotsParts.length < MINIMUM_SLOTS_SYMBOLS) {
      return await interaction.reply(errorEmbed.get(nws`Please provide more than \
      ${MINIMUM_SLOTS_SYMBOLS - 1} custom slot symbol.`))
    }
    slotsParts.forEach(slotPart => {
      slotPart = slotPart.trim()
      if (slotPart) {
        slots.push(slotPart)
      }
    })
    if (slots.length < MINIMUM_SLOTS_SYMBOLS) {
      return await interaction.reply(errorEmbed.get(nws`Please provide more than custom slot  \
        symbols than ${MINIMUM_SLOTS_SYMBOLS - 1}.`))
    }
    if (slots.length > MAXIMUM_SLOTS_SYMBOLS) {
      return await interaction.reply(errorEmbed.get(nws`Please provide fewer than \
      ${MAXIMUM_SLOTS_SYMBOLS+1} custom slot symbols.`))
    }
  }

  const slotResults = []
  for (let i = 0; i < slotsNumber; i++) {
    const position = random.integer(0, slots.length - 1)
    slotResults.push(slots.slice(position, position + 1))
  }
  return await interaction.reply(commonReplyEmbed.get('Your pull results:',
    `|${slotResults.join('|')}|`))
}