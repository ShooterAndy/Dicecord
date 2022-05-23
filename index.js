const { ShardingManager } = require('discord.js')
const logger = require('./helpers/logger')
require('dotenv').config()
const manager = new ShardingManager('./bot.js', { token: process.env.BOT_TOKEN })
const nws = require('./helpers/nws')

process.on('unhandledRejection', error => {
  logger.error('Unhandled promise rejection', error)
})

manager.on('shardCreate', shard => {
  logger.log(`Launched shard ${shard.id}`)

  shard.on('death', process => {
    logger.error(nws`Shard ${shard.id} closed unexpectedly! PID: "${process.pid }"; 
      Exit code: "${process.exitCode}".`)

    if (process.exitCode === null) {
      logger.warn(nws`WARNING: Shard "${shard.id}" exited with NULL error code. This may be a 
      result of a lack of available system memory. Ensure that there is enough memory allocated 
      to continue.`)
    }
  })
})

manager.spawn().then(() => {
  logger.log('Launched sharding manager')
  if (process.env.DBL_TOKEN) {
    const {AutoPoster} = require('topgg-autoposter')
    const poster = AutoPoster(process.env.DBL_TOKEN, manager)
    poster.on('error', err => {
      logger.error('Error in top-gg auto-poster', err)
    })
    poster.on('posted', stats => { // run when successfully posted
      logger.log(`Posted stats to Top.gg | ${stats.serverCount} servers`)
    })
  }
}).catch(err => {
  logger.error('Failed to spawn sharding manager', err)
})