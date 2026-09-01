const { dbPool } = require('../config/db');

const NOTIFICATION_TYPES = new Set(['claim', 'claim_status', 'item_status', 'marketplace', 'system']);

const ensureNotificationsSchema = async () => {
  // Keep the notifications table self-healing at startup so the app can boot against a fresh database.
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

  const [columnRows] = await dbPool.execute(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'notifications'
    `,
    [process.env.DB_NAME]
  );

  const existingColumns = new Set(columnRows.map((row) => row.COLUMN_NAME));

  const columns = [
    { name: 'related_item_id', definition: 'INT NULL', after: 'type' },
    { name: 'related_claim_id', definition: 'INT NULL', after: 'related_item_id' },
    { name: 'is_read', definition: 'BOOLEAN DEFAULT FALSE', after: 'related_claim_id' },
  ];

  for (const column of columns) {
    if (!existingColumns.has(column.name)) {
      await dbPool.execute(`ALTER TABLE notifications ADD COLUMN ${column.name} ${column.definition} AFTER ${column.after}`);
    }
  }
};

const normalizeNotificationType = (type) => {
  const value = (type || 'system').toString().trim();
  return NOTIFICATION_TYPES.has(value) ? value : 'system';
};

const mapNotification = (row) => ({
  id: row.id,
  user_id: row.user_id,
  title: row.title,
  message: row.message,
  type: normalizeNotificationType(row.type),
  related_item_id: row.related_item_id,
  related_claim_id: row.related_claim_id,
  is_read: Boolean(row.is_read),
  created_at: row.created_at,
});

const createNotification = async (userId, title, message, type, relatedItemId = null, relatedClaimId = null) => {
  const recipientId = Number.parseInt(userId, 10);

  if (!Number.isInteger(recipientId) || recipientId < 1) {
    return null;
  }

  const safeTitle = String(title || '').trim();
  const safeMessage = String(message || '').trim();

  if (!safeTitle || !safeMessage) {
    return null;
  }

  const notificationType = normalizeNotificationType(type);

  await dbPool.execute(
    `
      INSERT INTO notifications (user_id, title, message, type, related_item_id, related_claim_id, is_read)
      VALUES (?, ?, ?, ?, ?, ?, FALSE)
    `,
    [recipientId, safeTitle.slice(0, 150), safeMessage, notificationType, relatedItemId || null, relatedClaimId || null]
  );

  return true;
};

const getNotificationsForUser = async (userId, { page = 1, limit = 20 } = {}) => {
  // Retrieval is always user-scoped and newest-first, with unread counts returned alongside the page data.
  const recipientId = Number.parseInt(userId, 10);
  const pageNumber = Number.parseInt(page, 10);
  const pageLimit = Number.parseInt(limit, 10);

  if (!Number.isInteger(recipientId) || recipientId < 1) {
    return {
      notifications: [],
      currentPage: 1,
      totalPages: 0,
      totalNotifications: 0,
      unreadCount: 0,
    };
  }

  const currentPage = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const safeLimit = Number.isInteger(pageLimit) && pageLimit > 0 ? Math.min(pageLimit, 100) : 20;
  const offset = (currentPage - 1) * safeLimit;

  const [countRows] = await dbPool.execute(
    `
      SELECT COUNT(*) AS total_notifications,
        COALESCE(SUM(is_read = FALSE), 0) AS unread_count
      FROM notifications
      WHERE user_id = ?
    `,
    [recipientId]
  );

  const [rows] = await dbPool.execute(
    `
      SELECT id, user_id, title, message, type, related_item_id, related_claim_id, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ${safeLimit} OFFSET ${offset}
    `,
    [recipientId]
  );

  const totalNotifications = Number(countRows[0]?.total_notifications || 0);
  const totalPages = totalNotifications > 0 ? Math.ceil(totalNotifications / safeLimit) : 0;

  return {
    notifications: rows.map(mapNotification),
    currentPage: totalPages > 0 ? Math.min(currentPage, totalPages) : 1,
    totalPages,
    totalNotifications,
    unreadCount: Number(countRows[0]?.unread_count || 0),
  };
};

const getNotificationById = async (notificationId) => {
  // Read/unread and delete operations use this lookup first so ownership is verified before mutation.
  const [rows] = await dbPool.execute(
    `
      SELECT id, user_id, title, message, type, related_item_id, related_claim_id, is_read, created_at
      FROM notifications
      WHERE id = ?
      LIMIT 1
    `,
    [notificationId]
  );

  return rows[0] ? mapNotification(rows[0]) : null;
};

const markNotificationRead = async (notificationId, userId) => {
  // A notification can only be marked read by its owning user.
  const [result] = await dbPool.execute(
    `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = ?
        AND user_id = ?
    `,
    [notificationId, userId]
  );

  return result.affectedRows > 0;
};

const markAllNotificationsRead = async (userId) => {
  // Bulk-read keeps the UX simple for the notification center and navbar badge.
  const [result] = await dbPool.execute(
    `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = ?
        AND is_read = FALSE
    `,
    [userId]
  );

  return result.affectedRows;
};

const deleteNotification = async (notificationId, userId) => {
  // Deletion is also ownership-scoped so users never touch another account's records.
  const [result] = await dbPool.execute(
    `
      DELETE FROM notifications
      WHERE id = ?
        AND user_id = ?
    `,
    [notificationId, userId]
  );

  return result.affectedRows > 0;
};

module.exports = {
  createNotification,
  ensureNotificationsSchema,
  getNotificationsForUser,
  getNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};