const { ShardingManager } = require('discord.js')
const logger = require('./helpers/logger')
require('dotenv').config()
const manager = new ShardingManager('./bot.js', { token: process.env.BOT_TOKEN })

manager.on('shardCreate', shard => logger.log(`Launched shard ${shard.id}`))
manager.spawn().then(() => {
  logger.log('Launched sharding manager')
}).catch(err => {
  logger.error('Failed to spawn sharding manager', err)
})