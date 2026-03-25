// Create Reusable PostgreSQL connection pool,
// allow routes to query database

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;