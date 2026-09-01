CREATE TABLE IF NOT EXISTS conversation_participants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_conversation_user (conversation_id, user_id),
  KEY idx_conversation_participants_conversation_id (conversation_id),
  KEY idx_conversation_participants_user_id (user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
