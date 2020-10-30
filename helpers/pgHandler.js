const PostGresPromise = require('pg-promise')()
const prefix = require('./constants').DB_PREFIX

module.exports = {
  db: PostGresPromise(process.env.DATABASE_URL + '?ssl=true'),

  addPrefix(dbName) {
    return prefix + '.' + dbName
  }
}