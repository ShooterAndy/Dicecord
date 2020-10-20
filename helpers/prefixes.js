const pgHandler = require('../helpers/pgHandler');
const _ = require('underscore');
const dbName = 'prefixes';
const idColumn = 'guild_id';
const dataColumns = ['prefix'];

const Prefixes = module.exports = {
  prefixes: {},
  load: async () => {
    try {
      const data = await pgHandler.any(dbName);
      _.each(data, (item) => {
        let values = _.values(item);
        Prefixes.prefixes[values[0]] = values[1];
      });
      return Prefixes.prefixes;
    } catch(error) {
      throw error;
    }
  },
  set: async (guildId, prefix) => {
    try {
      await pgHandler.upsert(
        dbName,
        idColumn,
        dataColumns,
        guildId,
        [prefix])
      Prefixes.prefixes = await Prefixes.load();
    } catch(error) {
      throw error;
    }
  }
};