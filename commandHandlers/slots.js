const random = require('random')
const {
  DEFAULT_SLOTS_NUMBER,
  DEFAULT_SLOTS_SYMBOLS,
  MINIMUM_SLOTS_NUMBER,
  MAXIMUM_SLOTS_NUMBER,
  MINIMUM_SLOTS_SYMBOLS,
  MAXIMUM_SLOTS_SYMBOLS
} = require('../helpers/constants')
const nws = require('../helpers/nws')
const errorEmbed = require('../helpers/errorEmbed')
const saveableReplyEmbed = require('../helpers/saveableReplyEmbed')
const genericCommandSaver = require('../helpers/genericCommandSaver')
const replyOrFollowUp = require('../helpers/replyOrFollowUp')

module.exports = async (interaction, args) => {
  let { slotsNumber, customSlots } = args
  if (slotsNumber === null || slotsNumber === undefined) {
    slotsNumber = DEFAULT_SLOTS_NUMBER
  }


  if (slotsNumber < MINIMUM_SLOTS_NUMBER) {
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`Please set the number of slots to \
      more than ${MINIMUM_SLOTS_NUMBER - 1}.`))
  }
  if (slotsNumber > MAXIMUM_SLOTS_NUMBER) {
    return await replyOrFollowUp(interaction, errorEmbed.get(nws`Please set the number of slots to \
      fewer than ${MAXIMUM_SLOTS_NUMBER + 1}.`))
  }

  let slots = []
  if (!customSlots || !customSlots.trim()) {
    slots = DEFAULT_SLOTS_SYMBOLS
  } else {
    customSlots = customSlots.replace(/\s/g, ',').replace(/,+/g, ',')
    let slotsParts = customSlots.split(',')
    if (!slotsParts || slotsParts.length < MINIMUM_SLOTS_SYMBOLS) {
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Please provide more than \
      ${MINIMUM_SLOTS_SYMBOLS - 1} custom slot symbol.`))
    }
    slotsParts.forEach(slotPart => {
      slotPart = slotPart.trim()
      if (slotPart) {
        slots.push(slotPart)
      }
    })
    if (slots.length < MINIMUM_SLOTS_SYMBOLS) {
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Please provide more than custom \
        slot symbols than ${MINIMUM_SLOTS_SYMBOLS - 1}.`))
    }
    if (slots.length > MAXIMUM_SLOTS_SYMBOLS) {
      return await replyOrFollowUp(interaction, errorEmbed.get(nws`Please provide fewer than \
      ${MAXIMUM_SLOTS_SYMBOLS + 1} custom slot symbols.`))
    }
  }

  const slotResults = []
  for (let i = 0; i < slotsNumber; i++) {
    const position = random.integer(0, slots.length - 1)
    slotResults.push(slots.slice(position, position + 1))
  }
  const reply = saveableReplyEmbed.get('Your pull results:', `|${slotResults.join('|')}|`)
  reply.fetchReply = true

  const r = await replyOrFollowUp(interaction, reply)
  if (!r) return null

  await genericCommandSaver.launch(interaction, r)
}