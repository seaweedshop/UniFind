// One-off script to create the users table required by auth.
// Usage: node scripts/create_users_table.js

require('dotenv').config();
const { dbPool } = require('../config/db');

async function createUsersTable() {
  try {
    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        department VARCHAR(100) NOT NULL,
        year VARCHAR(50) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [rows] = await dbPool.execute(
      `
        SELECT COUNT(*) AS count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'branch'
      `,
      [process.env.DB_NAME]
    );

    if (rows[0]?.count > 0) {
      await dbPool.execute('ALTER TABLE users CHANGE COLUMN branch department VARCHAR(100) NOT NULL');
    }

    console.log('Users table created or already exists.');
  } catch (error) {
    console.error('Failed to create users table:', error.message);
    process.exit(1);
  } finally {
    await dbPool.end();
  }
}

createUsersTable();
