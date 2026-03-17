const PostGresPromise = require('pg-promise')()
const prefix = require('./constants').DB_PREFIX

const connectionConfig = {
  connectionString: process.env.DATABASE_URL + '?ssl=true',
  max: 5,      // max connections per cluster (default was 10)
  idleTimeoutMillis: 30000
}

module.exports = {
  db: PostGresPromise(connectionConfig),

  addPrefix(dbName) {
    return prefix + '.' + dbName
  }
}