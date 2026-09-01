// One-off script to create the claims table required by Phase 2A.
// Usage: node scripts/create_claims_table.js

require('dotenv').config();
const { dbPool } = require('../config/db');

async function createClaimsTable() {
  try {
    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS claims (
        id INT PRIMARY KEY AUTO_INCREMENT,
        item_id INT NOT NULL,
        claimer_id INT NOT NULL,
        owner_id INT NOT NULL,
        proof_description TEXT NOT NULL,
        contact_note TEXT DEFAULT NULL,
        status ENUM('Pending', 'Accepted', 'Rejected') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_claims_item_status_created_at (item_id, status, created_at),
        KEY idx_claims_owner_status_created_at (owner_id, status, created_at),
        KEY idx_claims_claimer_created_at (claimer_id, created_at),
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY (claimer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Claims table created or already exists.');
  } catch (error) {
    console.error('Failed to create claims table:', error.message);
    process.exit(1);
  } finally {
    await dbPool.end();
  }
}

createClaimsTable();