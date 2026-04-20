require('dotenv').config()
const { ClusterManager, HeartbeatManager } = require('discord-hybrid-sharding')
const logger = require('./helpers/logger')

const CLUSTER_MAX_OLD_SPACE_MB = 384

const manager = new ClusterManager('./bot.js', {
  totalShards: 'auto',
  totalClusters: 'auto',
  shardsPerClusters: 3,
  token: process.env.BOT_TOKEN,
  execArgv: [`--max_old_space_size=${CLUSTER_MAX_OLD_SPACE_MB}`]
})
const nws = require('./helpers/nws')
const { transformMinutesToMs } = require('./helpers/utilities')
const fs = require('fs')

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
const MEMORY_WARN_RATIO = 0.90   // 90% → start logging to console every tick
const MEMORY_CRIT_RATIO = 1.00   // 100% → also alert to Discord log channel
const MEMORY_POLL_MS = 60_000    // check every 60 seconds
const MEMORY_HOURLY_INTERVAL = 60 // send stats to Discord log channel every Nth tick (60 × 60s = 1h)

const _formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(1)
let _memoryTickCount = 0

/**
 * Read actual container memory from cgroup (Linux/Heroku).
 * Returns bytes or null if unavailable.
 */
const _readCgroupMemoryBytes = () => {
  // cgroup v2
  try {
    const val = fs.readFileSync('/sys/fs/cgroup/memory.current', 'utf8').trim()
    const parsed = parseInt(val, 10)
    if (parsed > 0) return parsed
  } catch {}
  // cgroup v1
  try {
    const val = fs.readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf8').trim()
    const parsed = parseInt(val, 10)
    if (parsed > 0) return parsed
  } catch {}
  // Note: /proc/meminfo is NOT usable in containers — it shows host memory.
  return null
}

// Log available cgroup paths once at startup for debugging
const _logCgroupPaths = () => {
  const paths = [
    '/sys/fs/cgroup/memory.current',
    '/sys/fs/cgroup/memory/memory.usage_in_bytes',
    '/sys/fs/cgroup/memory.max',
    '/sys/fs/cgroup/memory/memory.limit_in_bytes'
  ]
  for (const p of paths) {
    try {
      const val = fs.readFileSync(p, 'utf8').trim()
      console.log(`[MEMORY] Found ${p} = ${val}`)
    } catch {
      console.log(`[MEMORY] Not available: ${p}`)
    }
  }
  try {
    const meminfo = fs.readFileSync('/proc/meminfo', 'utf8')
    const total = meminfo.match(/MemTotal:\s+(\d+)/)?.[1]
    const avail = meminfo.match(/MemAvailable:\s+(\d+)/)?.[1]
    console.log(`[MEMORY] /proc/meminfo: MemTotal=${total}kB MemAvailable=${avail}kB`)
  } catch {
    console.log(`[MEMORY] /proc/meminfo not available`)
  }
}

const CHANNEL_SWEEP_INTERVAL = 10 // every 10th tick (10 × 60s = ~12 min)

const collectMemoryStats = async () => {
  _memoryTickCount++
  const managerMem = process.memoryUsage()

  // Periodically sweep channel caches on clusters to free memory
  if (_memoryTickCount % CHANNEL_SWEEP_INTERVAL === 0) {
    try {
      await manager.broadcastEval(c => {
        const before = c.channels.cache.size
        // Keep only channels the bot actively needs:
        // DM channels, and guild channels for guilds the bot is in
        // Sweep channels older than ~10 minutes that aren't DM-based
        // Actually, just do a size-based trim: keep max ~20k channels per cluster
        const MAX_CHANNELS = 20_000
        if (before > MAX_CHANNELS) {
          let removed = 0
          const target = before - MAX_CHANNELS
          c.channels.cache.sweep(ch => {
            if (removed >= target) return false
            // Don't sweep DM channels or channels with active threads
            if (ch.isDMBased?.()) return false
            removed++
            return true
          })
        }
        return { before, after: c.channels.cache.size }
      })
    } catch (err) {
      console.error('[MEMORY] Failed to sweep channel caches:', err.message || err)
    }
  }

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

  // Try to read actual container memory (more accurate than summing RSS)
  const cgroupBytes = _readCgroupMemoryBytes()
  const cgroupMB = cgroupBytes ? cgroupBytes / 1024 / 1024 : null
  const effectiveMB = cgroupMB ?? totalRssMB
  const ratio = effectiveMB / DYNO_QUOTA_MB
  const isWarning = ratio >= MEMORY_WARN_RATIO
  const isCritical = ratio >= MEMORY_CRIT_RATIO
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

  const cgroupNote = cgroupMB
    ? ` (cgroup=${cgroupMB.toFixed(1)}MB, sumRSS=${totalRssMB.toFixed(1)}MB)`
    : ''
  const totalLine = `[MEMORY] total=${effectiveMB.toFixed(1)}MB / ${DYNO_QUOTA_MB}MB `
    + `(${(ratio * 100).toFixed(0)}%)${cgroupNote}`

  // Console logging: only when warning threshold is crossed
  if (isWarning) {
    console.log(managerLine)
    clusterLines.forEach(line => console.log(line))
    console.log(totalLine)
  }

  // Discord log channel: every hour (info) or when critical (warning)
  if (isHourlyTick) {
    logger.log(`${totalLine}\n${managerLine}\n${clusterLines.join('\n')}`)
  } else if (isCritical) {
    logger.error(`${totalLine}\n${managerLine}\n${clusterLines.join('\n')}`)
  }
}

manager.spawn().then(() => {
  logger.log(nws`Launched cluster manager. ${manager.totalClusters} \
  clusters, ${manager.totalShards} shards.`)

  // Debug: log available cgroup paths once
  _logCgroupPaths()

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
