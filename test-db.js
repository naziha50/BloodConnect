// test-db.js
require('dotenv').config();
const pool = require('./server/db');

async function test() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Connected! PostgreSQL time:', result.rows[0].now);
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

test();