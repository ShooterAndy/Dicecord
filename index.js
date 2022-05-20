const { ShardingManager } = require('discord.js')
const logger = require('./helpers/logger')
require('dotenv').config()
const manager = new ShardingManager('./bot.js', { token: process.env.BOT_TOKEN })

manager.on('shardCreate', shard => logger.log(`Launched shard ${shard.id}`))
manager.spawn().then(() => {
  logger.log('Launched sharding manager')
  const { AutoPoster } = require('topgg-autoposter')
  const poster = AutoPoster(process.env.DBL_TOKEN, manager)
  poster.on('error', err => {
    logger.error('Error in top-gg auto-poster', err)
  })
  poster.on('posted', stats => { // ran when succesfully posted
    logger.log(`Posted stats to Top.gg | ${stats.serverCount} servers`)
  })
}).catch(err => {
  logger.error('Failed to spawn sharding manager', err)
})