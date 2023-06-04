module.exports = async (cluster, script, { context, callback }) => {
  const logger = require('./logger')
  if (!cluster) throw `No cluster provided to handleBroadcastEval`
  if (!script) throw `No script provided to handleBroadcastEval`
  if (typeof script !== 'function') throw `Script provided to handleBroadcastEval is not a function`
  const responses = await cluster.broadcastEval(script, { context })
  if (!responses || !responses.length) {
    logger.error(`No response from broadcast script ${script.name}`)
    return null
  }
  let result = null
  for (const response of responses) {
    if (response) {
      if (callback && (typeof callback === 'function')) {
        callback(response)
      }
      result = response
    }
  }
  return result
}