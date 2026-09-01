CREATE TABLE IF NOT EXISTS conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  item_id INT NOT NULL,
  conversation_type ENUM('lost_found', 'marketplace') NOT NULL,
  participant_one_id INT NOT NULL,
  participant_two_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conversation_item_participants (item_id, participant_one_id, participant_two_id),
  KEY idx_conversations_item_id (item_id),
  KEY idx_conversations_updated_at (updated_at),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_one_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_two_id) REFERENCES users(id) ON DELETE CASCADE
);
