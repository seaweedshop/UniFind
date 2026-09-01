const { dbPool } = require('../config/db');

const createNotificationsTable = async () => {
  await dbPool.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      title VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      type ENUM('claim', 'claim_status', 'item_status', 'marketplace', 'system') NOT NULL,
      related_item_id INT NULL,
      related_claim_id INT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_notifications_user_read_created_at (user_id, is_read, created_at),
      KEY idx_notifications_user_created_at (user_id, created_at),
      KEY idx_notifications_item (related_item_id),
      KEY idx_notifications_claim (related_claim_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (related_item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (related_claim_id) REFERENCES claims(id) ON DELETE CASCADE
    )
  `);

  console.log('Notifications table is ready.');
};

createNotificationsTable().catch((error) => {
  console.error('Failed to create notifications table:', error.message);
  process.exit(1);
});