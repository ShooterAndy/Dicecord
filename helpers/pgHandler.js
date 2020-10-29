const PostGresPromise = require('pg-promise')({
  query(e) {
    console.log('QUERY:', e.query);
  }
})
const prefix = require('./constants').DB_PREFIX

module.exports = {
  db: PostGresPromise(process.env.DATABASE_URL + '?ssl=true'),

  addPrefix(dbName) {
    return prefix + '.' + dbName
  }
}