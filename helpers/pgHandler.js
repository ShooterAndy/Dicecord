const PostGresPromise = require('pg-promise')({});
const prefix = 'public';

const pgHandler = module.exports = {
    db: PostGresPromise(process.env.DATABASE_URL + '?ssl=true'),
    async any(dbName, query, columns) {
        if (!columns) {
            columns = '*';
        }
        if (!query) {
            query = '';
        } else {
            query = ' ' + query;
        }
        try {
            return await pgHandler.db.any(
              `SELECT ${columns} FROM ${prefix}.${dbName}${query}`);
        } catch(error) {
            throw error;
        }
    },
    async one(dbName, query, columns) {
        if (!columns) {
            columns = '*';
        }
        if (!query) {
            query = '';
        } else {
            query = ' ' + query;
        }
        try {
            return await pgHandler.db.one(
              `SELECT ${columns} FROM ${prefix}.${dbName}${query}`);
        } catch(error) {
            throw error;
        }
    },
    async upsert(dbName, idColumn, dataColumns, idValue, dataValues) {
        try {
            const columns = idColumn + ',' + dataColumns.join(',');
            const values = '\'' + idValue +  '\',\'' + dataValues.join('\',\'') + '\'';
            const updateArray = [];
            dataColumns.forEach(dc => {
                updateArray.push(`${dc} = excluded.${dc}`)
            });
            const updateString = updateArray.join(',');
            const query = `INSERT INTO ${prefix}.${dbName} (${columns}) VALUES (${values}) ` +
              `ON CONFLICT (${idColumn}) DO UPDATE SET ${updateString}`;
            return await pgHandler.db.none(query);
        } catch(error) {
            throw error;
        }
    }
};