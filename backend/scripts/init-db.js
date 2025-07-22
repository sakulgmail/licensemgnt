const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
};

const dbName = process.env.DB_NAME || 'license_management';

async function createDatabase() {
  // Connect to the default 'postgres' database to create a new database
  const pool = new Pool({
    ...dbConfig,
    database: 'postgres' // Connect to default database
  });

  const client = await pool.connect();
  
  try {
    // Check if database exists
    const dbExists = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    // Create database if it doesn't exist
    if (dbExists.rows.length === 0) {
      console.log(`Creating database: ${dbName}`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log('Database created successfully');
    } else {
      console.log(`Database ${dbName} already exists`);
    }
  } catch (err) {
    console.error('Error creating database:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  // Now run the migrations
  await runMigrations();
}

async function runMigrations() {
  // Connect to the new database
  const pool = new Pool({
    ...dbConfig,
    database: dbName
  });

  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');

    // Read and execute the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migrations...');
    await client.query(migrationSQL);
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Migrations completed successfully');
  } catch (err) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error running migrations:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Create admin user
async function createAdminUser() {
  const pool = new Pool({
    ...dbConfig,
    database: dbName
  });

  const client = await pool.connect();
  
  try {
    // Check if admin user exists
    const adminExists = await client.query(
      'SELECT id FROM users WHERE username = $1',
      ['admin']
    );

    if (adminExists.rows.length === 0) {
      console.log('Creating admin user...');
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await client.query(
        `INSERT INTO users 
         (username, email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id, username, email, full_name, role`,
        ['admin', 'admin@example.com', hashedPassword, 'Administrator', 'admin']
      );
      
      console.log('Admin user created successfully');
      console.log('Username: admin');
      console.log('Password: admin123');
      console.log('Please change the password after first login!');
    } else {
      console.log('Admin user already exists');
    }
  } catch (err) {
    console.error('Error creating admin user:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
async function setupDatabase() {
  try {
    await createDatabase();
    await createAdminUser();
    console.log('Database setup completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Database setup failed:', err);
    process.exit(1);
  }
}

setupDatabase();
