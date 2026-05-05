const { Pool } = require('pg');
require('dotenv').config();

// Railway fornece DATABASE_URL completo
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') 
    ? { rejectUnauthorized: false } 
    : false,
});

module.exports = { pool, query: (text, params) => pool.query(text, params) };
