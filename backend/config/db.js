const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'license_mgnt',  // Changed from 'license_management' to 'license_mgnt'
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
  connectionTimeoutMillis: 5000,  // 5 seconds
  idleTimeoutMillis: 30000,       // 30 seconds
  max: 20,                       // max number of clients in the pool
});

// Test the connection
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Successfully connected to the database');
  }
});

module.exports = { pool };
