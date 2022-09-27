const Cluster = require('discord-hybrid-sharding')
const logger = require('./helpers/logger')
require('dotenv').config()
const manager = new Cluster.Manager('./bot.js', {
  totalShards: 'auto',
  totalClusters: 'auto',
  shardsPerClusters: 2,
  token: process.env.BOT_TOKEN
})
const nws = require('./helpers/nws')
const { transformMinutesToMs } = require('./helpers/utilities')

process.on('unhandledRejection', error => {
  logger.error('Unhandled promise rejection', error)
})

manager.on('clusterCreate', cluster => {
  logger.log(`Launched cluster ${cluster.id}`)

  cluster.on('death', process => {
    logger.error(nws`Cluster ${cluster.id} closed unexpectedly! PID: "${process.pid }"; 
      Exit code: "${process.exitCode}".`)

    if (process.exitCode === null) {
      logger.warn(nws`WARNING: Cluster "${cluster.id}" exited with NULL error code. This may be a \
      result of a lack of available system memory. Ensure that there is enough memory allocated \
      to continue.`)
    }
  })
})

manager.spawn().then(() => {
  logger.log(nws`Launched cluster manager. ${manager.totalClusters} \
  clusters, ${manager.totalShards} shards.`)
  if (process.env.DBL_TOKEN) {
    const TopGG = require('@top-gg/sdk')
    try {
      const api = new TopGG.Api(process.env.DBL_TOKEN)
      const postBotStats = () => {
        manager.fetchClientValues('guilds.cache.size').then(results => {
          logger.log('Received stats: ' + JSON.stringify(results))
          const totalGuilds = results.reduce((prev, val) => prev + val, 0)
          api.postStats({
            serverCount: totalGuilds,
            shardCount: manager.totalShards
          }).then(() => {
            logger.log(nws`Posted stats to top.gg: ${totalGuilds} total \
            guilds, ${manager.totalShards} total shards`)
          }).catch(err => {
            logger.error('Failed to post bot stats', err)
          })
        }).catch(err => {
          logger.error('Failed to fetch client values', err)
        })
      }

      postBotStats()
      setInterval(async () => {
        await postBotStats()
      }, transformMinutesToMs(30))
    } catch (err) {
      logger.error('Failed to create Top GG API instance', err)
    }
  }
}).catch(err => {
  logger.error('Failed to spawn cluster manager', err)
})