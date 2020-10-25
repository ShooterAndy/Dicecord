const PostGresPromise = require('pg-promise')({})
const prefix = require('./constants').DB_PREFIX

const getColumnsList = (columns) => {
  if (!columns) {
    columns = '*'
  }
  return columns
};

const getQuery = (query) => {
  if (!query) {
    query = ''
  } else {
    query = ' ' + query
  }
  return query
};

const pgHandler = module.exports = {
  db: PostGresPromise(process.env.DATABASE_URL + '?ssl=true'),
  async any(dbName, query, columns) {
    columns = getColumnsList(columns)
    query = getQuery(query);
    try {
      return await pgHandler.db.any(
        `SELECT ${columns} FROM ${prefix}.${dbName}${query}`)
    } catch(error) {
      throw error
    }
  },
  async one(dbName, query, columns) {
    columns = getColumnsList(columns);
    query = getQuery(query);
    try {
      return await pgHandler.db.one(
        `SELECT ${columns} FROM ${prefix}.${dbName}${query}`)
    } catch(error) {
      throw error
    }
  },
  async oneOrNone(dbName, query, columns) {
    columns = getColumnsList(columns);
    query = getQuery(query);

    try {
      return await pgHandler.db.oneOrNone(
        `SELECT ${columns} FROM ${prefix}.${dbName}${query}`)
    } catch(error) {
      throw error
    }
  },
  async upsert(dbName, idColumn, dataColumns, idValue, dataValues) {
    try {
      const columns = idColumn + ',' + dataColumns.join(',')
      const values = '\'' + idValue +  '\',\'' + dataValues.join('\',\'') + '\''
      const updateArray = []
      dataColumns.forEach(dc => {
        updateArray.push(`${dc} = excluded.${dc}`)
      })
      const updateString = updateArray.join(',')
      const query = `INSERT INTO ${prefix}.${dbName} (${columns}) VALUES (${values}) ` +
        `ON CONFLICT (${idColumn}) DO UPDATE SET ${updateString}`
      return await pgHandler.db.none(query)
    } catch(error) {
      throw error
    }
  },
  async upsertWithoutId(dbName, keyColumns, dataColumns, dataValues, timestampColumn) {
    try {
      const columns = dataColumns.join(',') + (timestampColumn ? (',' + timestampColumn) : '')
      const values = '\'' + dataValues.join('\',\'') + '\'' +
        (timestampColumn ? ',NOW()' : '')
      const updateArray = []
      dataColumns.forEach(dc => {
        if (keyColumns.indexOf(dc) === -1) {
          updateArray.push(`${dc} = excluded.${dc}`)
        }
      })
      let updateString = updateArray.join(',') +
        (timestampColumn ? (`, ${timestampColumn} = excluded.${timestampColumn}`) : '')
      const keyString = keyColumns.join(',')

      const query = `INSERT INTO ${prefix}.${dbName} (${columns}) VALUES (${values}) ` +
        `ON CONFLICT (${keyString}) DO UPDATE SET ${updateString}`

      return await pgHandler.db.none(query)
    } catch(error) {
      throw error
    }
  },
  async updateTimestamp(dbName, timestampColumn, whereQuery) {
    try {
      const query = `UPDATE ${prefix}.${dbName} SET ${timestampColumn} = NOW() ` +
        `WHERE ${whereQuery}`

      return await pgHandler.db.none(query)
    } catch(error) {
      throw error
    }
  },
  async deleteOneOrNone(dbName, query) {
    query = getQuery(query);

    try {
      return await pgHandler.db.oneOrNone(
        `DELETE FROM ${prefix}.${dbName}${query} RETURNING *`);
    } catch(error) {
      throw error
    }
  },
  async deleteAny(dbName, query) {
    query = getQuery(query);

    try {
      return await pgHandler.db.any(
        `DELETE FROM ${prefix}.${dbName}${query} RETURNING *`);
    } catch(error) {
      throw error
    }
  },
};