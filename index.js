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

process.on('unhandledRejection', error => {
  logger.error('Unhandled promise rejection', error)
})

manager.on('clusterCreate', cluster => {
  logger.log(`Launched cluster ${cluster.id}`)

  cluster.on('death', process => {
    logger.error(nws`Cluster ${cluster.id} closed unexpectedly! PID: "${process.pid }"; 
      Exit code: "${process.exitCode}".`)

    if (process.exitCode === null) {
      logger.warn(nws`WARNING: Cluster "${cluster.id}" exited with NULL error code. This may be a 
      result of a lack of available system memory. Ensure that there is enough memory allocated 
      to continue.`)
    }
  })
})

manager.spawn().then(() => {
  logger.log(`Launched cluster manager. ${manager.totalClusters} clusters, ${manager.totalShards} shards.`)
  if (process.env.DBL_TOKEN) {
    const { AutoPoster } = require('topgg-autoposter')
    const poster = AutoPoster(process.env.DBL_TOKEN, manager)
    poster.on('error', err => {
      logger.error('Error in top-gg auto-poster', err)
    })
    poster.on('posted', stats => { // run when successfully posted
      logger.log(`Posted stats to Top.gg | ${stats.serverCount} servers`)
    })
  }
}).catch(err => {
  logger.error('Failed to spawn cluster manager', err)
})