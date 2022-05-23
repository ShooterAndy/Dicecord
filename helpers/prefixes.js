const pgHandler = require('./pgHandler')
const _ = require('underscore')
const {
  PREFIXES_DB_NAME,
  PREFIXES_COLUMNS
} = require('./constants')
const logger = require('./logger')

const Prefixes = module.exports = {
  prefixes: {},
  load: async () => {
    try {
      const data = await pgHandler.db.any('SELECT * FROM ${db#}',
        { db: pgHandler.addPrefix(PREFIXES_DB_NAME) })
      if (!data || !data.length) {
        logger.error(`The list of prefixes appears to be empty`)
        return {}
      }
      _.each(data, (item) => {
        let values = _.values(item)
        Prefixes.prefixes[values[0]] = values[1]
      })
      return Prefixes.prefixes
    } catch (error) {
      throw error
    }
  },
  set: async (guildId, prefix) => {
    try {
      await pgHandler.db.none(
        'INSERT INTO ${db#} (${guildId~}, ${prefix~}) ' +
        'VALUES (${guildIdValue}, ${prefixValue}) ON CONFLICT (${guildId~}) ' +
        'DO UPDATE SET ${prefix~}=excluded.${prefix~}', {
          db: pgHandler.addPrefix(PREFIXES_DB_NAME),
          guildId: PREFIXES_COLUMNS.guild_id,
          prefix: PREFIXES_COLUMNS.prefix,
          guildIdValue: guildId,
          prefixValue: prefix
        })
      Prefixes.prefixes = await Prefixes.load()
    } catch(error) {
      throw error
    }
  }
}