// One-off script to create the items table required by Phase 1C.
// Usage: node scripts/create_items_table.js

require('dotenv').config();
const { dbPool } = require('../config/db');

async function createItemsTable() {
  try {
    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        item_type ENUM('lost', 'found', 'sell') NOT NULL,
        image VARCHAR(255),
        location VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        price DECIMAL(10,2) DEFAULT NULL,
        condition_status VARCHAR(100) DEFAULT NULL,
        resolved BOOLEAN DEFAULT FALSE,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_items_item_type_created_at (item_type, created_at),
        KEY idx_items_category (category),
        KEY idx_items_user_id_created_at (user_id, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Items table created or already exists.');
  } catch (error) {
    console.error('Failed to create items table:', error.message);
    process.exit(1);
  } finally {
    await dbPool.end();
  }
}

createItemsTable();
