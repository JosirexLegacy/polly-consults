const { Pool } = require('pg');
require('dotenv').config();

const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'lsm_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: isVercel ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
  };
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('✅ Connected to Neon PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL error:', err.message);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Neon connected at:', res.rows[0].now);
  }
});

module.exports = pool;