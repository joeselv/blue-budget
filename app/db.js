const { Pool } = require('pg');
const env = require('../config/env.json');


if (process.env.NODE_ENV == "production") {

    config = { connectionString: process.env.DATABASE_URL };
} else {

  config = {
      user: env.user,
      host: env.host,
      database: env.database,
      password: env.password,
      port: env.port,
      ssl: env.ssl
  };
}

const pool = new Pool(config);

module.exports = pool;
