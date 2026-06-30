// One-off script to create the database specified in .env if it doesn't exist.
// Usage: node scripts/create_db.js

require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'lost_found_db';

async function createDatabase() {
  let connection;
  try {
    // Connect without specifying database
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true,
    });

    const createSql = `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`;
    await connection.query(createSql);
    console.log(`Database '${DB_NAME}' created or already exists.`);
  } catch (err) {
    console.error('Failed to create database:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

createDatabase();
