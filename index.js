require('dotenv').config()
const { ClusterManager, HeartbeatManager } = require('discord-hybrid-sharding')
const logger = require('./helpers/logger')

const CLUSTER_MAX_OLD_SPACE_MB = 256

const manager = new ClusterManager('./bot.js', {
  totalShards: 'auto',
  totalClusters: 'auto',
  shardsPerClusters: 2,
  token: process.env.BOT_TOKEN,
  execArgv: [`--max_old_space_size=${CLUSTER_MAX_OLD_SPACE_MB}`]
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

  cluster.on('disconnect', () => {
    logger.warn(`Cluster ${cluster.id} disconnected`)
  })

  cluster.on('reconnecting', () => {
    logger.warn(`Cluster ${cluster.id} reconnecting`)
  })
})

manager.extend(
  new HeartbeatManager({
    interval: 30000, // Interval to send a heartbeat (30 seconds)
    maxMissedHeartbeats: 5, // 5 × 30s = 150s grace before respawn
  })
)

// --- Adaptive memory monitoring (console-only unless thresholds are breached) ---
const DYNO_QUOTA_MB = 1024
const MEMORY_WARN_RATIO = 0.70   // 70% → start logging every tick
const MEMORY_CRIT_RATIO = 0.90   // 90% → also alert to Discord log channel
const MEMORY_POLL_MS = 60_000    // check every 60 seconds
const MEMORY_QUIET_INTERVAL = 10 // in quiet mode, only log to console every Nth tick
const MEMORY_HOURLY_INTERVAL = 60 // send stats to Discord log channel every Nth tick (60 × 60s = 1h)

const _formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(1)
let _memoryTickCount = 0

const collectMemoryStats = async () => {
  _memoryTickCount++
  const managerMem = process.memoryUsage()
  let clusterResults = []
  try {
    clusterResults = await manager.broadcastEval(c => {
      const m = process.memoryUsage()
      return {
        cluster: c.cluster?.id ?? '?',
        rss: m.rss,
        heapUsed: m.heapUsed,
        heapTotal: m.heapTotal,
        guilds: c.guilds?.cache?.size ?? 0,
        channels: c.channels?.cache?.size ?? 0,
        interactionListeners: c.listenerCount?.('interactionCreate') ?? -1
      }
    })
  } catch (err) {
    console.error('[MEMORY] Failed to collect cluster memory stats:', err.message || err)
    return
  }

  const totalRssMB =
    managerMem.rss / 1024 / 1024 +
    clusterResults.reduce((sum, r) => sum + (r ? r.rss / 1024 / 1024 : 0), 0)

  const ratio = totalRssMB / DYNO_QUOTA_MB
  const isWarning = ratio >= MEMORY_WARN_RATIO
  const isCritical = ratio >= MEMORY_CRIT_RATIO
  const isQuietTick = _memoryTickCount % MEMORY_QUIET_INTERVAL !== 0
  const isHourlyTick = _memoryTickCount % MEMORY_HOURLY_INTERVAL === 0

  // Build summary lines (needed for both console and Discord)
  const managerLine = nws`[MEMORY][manager] rss=${_formatMB(managerMem.rss)}MB \
    heapUsed=${_formatMB(managerMem.heapUsed)}MB \
    heapTotal=${_formatMB(managerMem.heapTotal)}MB`

  const clusterLines = []
  for (const r of clusterResults) {
    if (!r) continue
    clusterLines.push(nws`[MEMORY][cluster ${r.cluster}] rss=${_formatMB(r.rss)}MB \
      heap=${_formatMB(r.heapUsed)}/${_formatMB(r.heapTotal)}MB \
      guilds=${r.guilds} channels=${r.channels} \
      interactionListeners=${r.interactionListeners}`)
  }

  const totalLine = `[MEMORY] total rss=${totalRssMB.toFixed(1)}MB / ${DYNO_QUOTA_MB}MB `
    + `(${(ratio * 100).toFixed(0)}%)`

  // Console logging: every tick when warning+, every MEMORY_QUIET_INTERVAL ticks otherwise
  const shouldLogToConsole = isWarning || !isQuietTick
  if (shouldLogToConsole) {
    console.log(managerLine)
    clusterLines.forEach(line => console.log(line))
    console.log(totalLine)
  }

  // Discord log channel: every hour (info) or when critical (warning)
  if (isHourlyTick) {
    logger.log(`${totalLine}\n${managerLine}\n${clusterLines.join('\n')}`)
  } else if (isCritical) {
    logger.warn(`${totalLine}\n${managerLine}\n${clusterLines.join('\n')}`)
  }
}

manager.spawn().then(() => {
  logger.log(nws`Launched cluster manager. ${manager.totalClusters} \
  clusters, ${manager.totalShards} shards.`)

  // Memory monitoring — polls every 60s, only logs when thresholds are crossed
  // (or every ~10 minutes in quiet mode)
  setInterval(collectMemoryStats, MEMORY_POLL_MS)
  collectMemoryStats()

  if (process.env.DBL_TOKEN) {
    const { Api } = require('@top-gg/sdk')
    try {
      const topGGApi = new Api(process.env.DBL_TOKEN)
      const postBotStats = () => {
        manager.fetchClientValues('guilds.cache.size').then(results => {
          logger.log('Received stats: ' + JSON.stringify(results))
          const totalGuilds = results.reduce((prev, val) => prev + val, 0)
          topGGApi.postStats({
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
      setInterval(postBotStats, transformMinutesToMs(30))
    } catch (err) {
      logger.error('Failed to create Top GG API instance', err)
    }
  }
}).catch(err => {
  logger.error('Failed to spawn cluster manager', err)
})
