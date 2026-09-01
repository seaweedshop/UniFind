const { dbPool } = require('../config/db');

const CONVERSATION_TYPES = {
  LOST_FOUND: 'lost_found',
  MARKETPLACE: 'marketplace',
};

const MAX_MESSAGE_LENGTH = 1000;

const normalizeConversationType = (itemType) => {
  return itemType === 'sell' ? CONVERSATION_TYPES.MARKETPLACE : CONVERSATION_TYPES.LOST_FOUND;
};

const sanitizeMessage = (message) => {
  return String(message || '')
    .replace(/\u0000/g, '')
    .trim();
};

const sortParticipantIds = (firstUserId, secondUserId) => {
  return firstUserId < secondUserId ? [firstUserId, secondUserId] : [secondUserId, firstUserId];
};

const ensureMessagingSchema = async () => {
  await dbPool.execute(`
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
    )
  `);

  await dbPool.execute(`
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
    )
  `);

  await dbPool.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT PRIMARY KEY AUTO_INCREMENT,
      conversation_id INT NOT NULL,
      sender_id INT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_messages_conversation_id (conversation_id),
      KEY idx_messages_sender_id (sender_id),
      KEY idx_messages_created_at (created_at),
      KEY idx_messages_conversation_read_sender (conversation_id, is_read, sender_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
};

const getItemById = async (itemId) => {
  const [rows] = await dbPool.execute(
    `
      SELECT id, title, item_type, item_status, resolved, user_id
      FROM items
      WHERE id = ?
      LIMIT 1
    `,
    [itemId]
  );

  return rows[0] || null;
};

const getUserById = async (userId) => {
  const [rows] = await dbPool.execute(
    `
      SELECT id, full_name
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

const isItemClosedForNewConversation = (item) => {
  if (!item) {
    return { blocked: true, message: 'Item not found.' };
  }

  const isResolved = Boolean(item.resolved) || item.item_status === 'Resolved';

  if (!isResolved) {
    return { blocked: false, message: '' };
  }

  if (item.item_type === 'sell') {
    return { blocked: true, message: 'This item has been sold.' };
  }

  return { blocked: true, message: 'This item has already been resolved.' };
};

const findConversationByPair = async (itemId, participantOneId, participantTwoId) => {
  const [rows] = await dbPool.execute(
    `
      SELECT c.id, c.item_id, c.conversation_type, c.created_at, c.updated_at
      FROM conversations c
      WHERE c.item_id = ?
        AND c.participant_one_id = ?
        AND c.participant_two_id = ?
      LIMIT 1
    `,
    [itemId, participantOneId, participantTwoId]
  );

  return rows[0] || null;
};

const getConversationParticipantDetails = async (conversationId, currentUserId) => {
  const [rows] = await dbPool.execute(
    `
      SELECT
        cp.user_id,
        u.full_name
      FROM conversation_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.conversation_id = ?
      ORDER BY cp.user_id ASC
    `,
    [conversationId]
  );

  const participants = rows.map((row) => ({ id: row.user_id, full_name: row.full_name }));
  const otherParticipant = participants.find((participant) => participant.id !== currentUserId) || null;

  return {
    participants,
    otherParticipant,
  };
};

const getConversationByIdForUser = async (conversationId, userId) => {
  const [rows] = await dbPool.execute(
    `
      SELECT
        c.id,
        c.item_id,
        c.conversation_type,
        c.created_at,
        c.updated_at,
        i.title AS item_title,
        i.item_type,
        i.item_status,
        i.resolved,
        i.user_id AS item_owner_id
      FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id
      JOIN items i ON i.id = c.item_id
      WHERE c.id = ?
        AND cp.user_id = ?
      LIMIT 1
    `,
    [conversationId, userId]
  );

  if (!rows[0]) {
    return null;
  }

  const conversation = rows[0];
  const participantDetails = await getConversationParticipantDetails(conversation.id, userId);

  return {
    id: conversation.id,
    item_id: conversation.item_id,
    conversation_type: conversation.conversation_type,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    item: {
      id: conversation.item_id,
      title: conversation.item_title,
      item_type: conversation.item_type,
      item_status: conversation.item_status,
      resolved: Boolean(conversation.resolved),
      owner_id: conversation.item_owner_id,
    },
    participants: participantDetails.participants,
    other_user: participantDetails.otherParticipant,
  };
};

const assertParticipant = async (conversationId, userId) => {
  const [rows] = await dbPool.execute(
    `
      SELECT id
      FROM conversation_participants
      WHERE conversation_id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [conversationId, userId]
  );

  return Boolean(rows[0]);
};

const createOrGetConversation = async ({ itemId, initiatorId, recipientId }) => {
  const safeItemId = Number.parseInt(itemId, 10);
  const safeInitiatorId = Number.parseInt(initiatorId, 10);
  const safeRecipientId = Number.parseInt(recipientId, 10);

  if (!Number.isInteger(safeItemId) || safeItemId < 1) {
    const error = new Error('Item id must be a valid number.');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(safeRecipientId) || safeRecipientId < 1) {
    const error = new Error('Recipient id must be a valid number.');
    error.statusCode = 400;
    throw error;
  }

  if (safeInitiatorId === safeRecipientId) {
    const error = new Error('You cannot message yourself.');
    error.statusCode = 400;
    throw error;
  }

  const recipient = await getUserById(safeRecipientId);

  if (!recipient) {
    const error = new Error('Recipient not found.');
    error.statusCode = 404;
    throw error;
  }

  const item = await getItemById(safeItemId);

  if (!item) {
    const error = new Error('Item not found.');
    error.statusCode = 404;
    throw error;
  }

  if (safeInitiatorId !== item.user_id && safeRecipientId !== item.user_id) {
    const error = new Error('Conversations can only be created between the item owner and one other student.');
    error.statusCode = 403;
    throw error;
  }

  const [participantOneId, participantTwoId] = sortParticipantIds(safeInitiatorId, safeRecipientId);

  const existingConversation = await findConversationByPair(safeItemId, participantOneId, participantTwoId);

  if (existingConversation) {
    const conversation = await getConversationByIdForUser(existingConversation.id, safeInitiatorId);
    return {
      created: false,
      conversation,
    };
  }

  const restriction = isItemClosedForNewConversation(item);

  if (restriction.blocked) {
    const error = new Error(restriction.message);
    error.statusCode = 409;
    throw error;
  }

  const conversationType = normalizeConversationType(item.item_type);
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    const [conversationResult] = await connection.execute(
      `
        INSERT INTO conversations (
          item_id,
          conversation_type,
          participant_one_id,
          participant_two_id,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [safeItemId, conversationType, participantOneId, participantTwoId]
    );

    const conversationId = conversationResult.insertId;

    await connection.execute(
      `
        INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [conversationId, participantOneId, conversationId, participantTwoId]
    );

    await connection.commit();

    const createdConversation = await getConversationByIdForUser(conversationId, safeInitiatorId);

    return {
      created: true,
      conversation: createdConversation,
    };
  } catch (error) {
    await connection.rollback();

    if (error.code === 'ER_DUP_ENTRY') {
      const duplicateConversation = await findConversationByPair(safeItemId, participantOneId, participantTwoId);

      if (duplicateConversation) {
        const conversation = await getConversationByIdForUser(duplicateConversation.id, safeInitiatorId);
        return {
          created: false,
          conversation,
        };
      }
    }

    throw error;
  } finally {
    connection.release();
  }
};

const getConversationsForUser = async (userId, { page = 1, limit = 20 } = {}) => {
  const safeUserId = Number.parseInt(userId, 10);
  const pageNumber = Number.parseInt(page, 10);
  const pageLimit = Number.parseInt(limit, 10);
  const currentPage = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const safeLimit = Number.isInteger(pageLimit) && pageLimit > 0 ? Math.min(pageLimit, 50) : 20;
  const offset = (currentPage - 1) * safeLimit;

  const [countRows] = await dbPool.execute(
    `
      SELECT COUNT(*) AS total_conversations
      FROM conversation_participants
      WHERE user_id = ?
    `,
    [safeUserId]
  );

  const [rows] = await dbPool.execute(
    `
      SELECT
        c.id,
        c.item_id,
        c.conversation_type,
        c.created_at,
        c.updated_at,
        i.title AS item_title,
        i.item_type,
        i.item_status,
        i.resolved,
        other_user.id AS other_user_id,
        other_user.full_name AS other_user_name,
        m_last.id AS last_message_id,
        m_last.message AS last_message,
        m_last.created_at AS last_message_at,
        m_last.sender_id AS last_message_sender_id,
        COALESCE(unread_messages.unread_count, 0) AS unread_count
      FROM conversation_participants cp
      JOIN conversations c ON c.id = cp.conversation_id
      JOIN items i ON i.id = c.item_id
      JOIN conversation_participants cp_other
        ON cp_other.conversation_id = c.id
        AND cp_other.user_id <> ?
      JOIN users other_user ON other_user.id = cp_other.user_id
      LEFT JOIN (
        SELECT m1.conversation_id, m1.id, m1.message, m1.created_at, m1.sender_id
        FROM messages m1
        JOIN (
          SELECT conversation_id, MAX(id) AS max_id
          FROM messages
          GROUP BY conversation_id
        ) grouped ON grouped.conversation_id = m1.conversation_id AND grouped.max_id = m1.id
      ) m_last ON m_last.conversation_id = c.id
      LEFT JOIN (
        SELECT conversation_id, COUNT(*) AS unread_count
        FROM messages
        WHERE sender_id <> ? AND is_read = FALSE
        GROUP BY conversation_id
      ) unread_messages ON unread_messages.conversation_id = c.id
      WHERE cp.user_id = ?
      ORDER BY c.updated_at DESC, c.id DESC
      LIMIT ? OFFSET ?
    `,
    [safeUserId, safeUserId, safeUserId, safeLimit, offset]
  );

  const totalConversations = Number(countRows[0]?.total_conversations || 0);
  const totalPages = totalConversations > 0 ? Math.ceil(totalConversations / safeLimit) : 0;

  return {
    conversations: rows.map((row) => ({
      id: row.id,
      item_id: row.item_id,
      conversation_type: row.conversation_type,
      created_at: row.created_at,
      updated_at: row.updated_at,
      item: {
        id: row.item_id,
        title: row.item_title,
        item_type: row.item_type,
        item_status: row.item_status,
        resolved: Boolean(row.resolved),
      },
      other_user: {
        id: row.other_user_id,
        full_name: row.other_user_name,
      },
      last_message: row.last_message_id
        ? {
            id: row.last_message_id,
            message: row.last_message,
            created_at: row.last_message_at,
            sender_id: row.last_message_sender_id,
          }
        : null,
      unread_count: Number(row.unread_count || 0),
    })),
    currentPage: totalPages > 0 ? Math.min(currentPage, totalPages) : 1,
    totalPages,
    totalConversations,
    limit: safeLimit,
  };
};

const getUnreadSummaryForUser = async (userId) => {
  const safeUserId = Number.parseInt(userId, 10);

  const [rows] = await dbPool.execute(
    `
      SELECT
        COUNT(*) AS total_unread_messages,
        COUNT(DISTINCT conversation_id) AS unread_conversations
      FROM messages
      WHERE sender_id <> ?
        AND is_read = FALSE
        AND conversation_id IN (
          SELECT conversation_id
          FROM conversation_participants
          WHERE user_id = ?
        )
    `,
    [safeUserId, safeUserId]
  );

  return {
    unreadMessages: Number(rows[0]?.total_unread_messages || 0),
    unreadConversations: Number(rows[0]?.unread_conversations || 0),
  };
};

const getConversationMessagesForUser = async (
  conversationId,
  userId,
  { page = 1, limit = 30 } = {}
) => {
  const safeConversationId = Number.parseInt(conversationId, 10);
  const safeUserId = Number.parseInt(userId, 10);

  const hasAccess = await assertParticipant(safeConversationId, safeUserId);

  if (!hasAccess) {
    const error = new Error('This conversation is unavailable.');
    error.statusCode = 403;
    throw error;
  }

  const pageNumber = Number.parseInt(page, 10);
  const pageLimit = Number.parseInt(limit, 10);
  const currentPage = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const safeLimit = Number.isInteger(pageLimit) && pageLimit > 0 ? Math.min(pageLimit, 100) : 30;
  const offset = (currentPage - 1) * safeLimit;

  const [countRows] = await dbPool.execute(
    `
      SELECT COUNT(*) AS total_messages
      FROM messages
      WHERE conversation_id = ?
    `,
    [safeConversationId]
  );

  const [rows] = await dbPool.execute(
    `
      SELECT id, conversation_id, sender_id, message, is_read, created_at
      FROM (
        SELECT id, conversation_id, sender_id, message, is_read, created_at
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?
      ) paged
      ORDER BY created_at ASC, id ASC
    `,
    [safeConversationId, safeLimit, offset]
  );

  const totalMessages = Number(countRows[0]?.total_messages || 0);
  const totalPages = totalMessages > 0 ? Math.ceil(totalMessages / safeLimit) : 0;

  return {
    messages: rows.map((row) => ({
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      message: row.message,
      is_read: Boolean(row.is_read),
      created_at: row.created_at,
    })),
    currentPage: totalPages > 0 ? Math.min(currentPage, totalPages) : 1,
    totalPages,
    totalMessages,
    limit: safeLimit,
  };
};

const markConversationReadForUser = async (conversationId, userId) => {
  const safeConversationId = Number.parseInt(conversationId, 10);
  const safeUserId = Number.parseInt(userId, 10);

  const hasAccess = await assertParticipant(safeConversationId, safeUserId);

  if (!hasAccess) {
    const error = new Error('This conversation is unavailable.');
    error.statusCode = 403;
    throw error;
  }

  const [result] = await dbPool.execute(
    `
      UPDATE messages
      SET is_read = TRUE
      WHERE conversation_id = ?
        AND sender_id <> ?
        AND is_read = FALSE
    `,
    [safeConversationId, safeUserId]
  );

  await dbPool.execute(
    `
      UPDATE conversation_participants
      SET last_read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ?
        AND user_id = ?
    `,
    [safeConversationId, safeUserId]
  );

  return Number(result.affectedRows || 0);
};

const sendMessageInConversation = async ({ conversationId, senderId, message }) => {
  const safeConversationId = Number.parseInt(conversationId, 10);
  const safeSenderId = Number.parseInt(senderId, 10);
  const safeMessage = sanitizeMessage(message);

  if (!safeMessage) {
    const error = new Error('Message cannot be empty.');
    error.statusCode = 400;
    throw error;
  }

  if (safeMessage.length > MAX_MESSAGE_LENGTH) {
    const error = new Error(`Message is too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters.`);
    error.statusCode = 400;
    throw error;
  }

  const hasAccess = await assertParticipant(safeConversationId, safeSenderId);

  if (!hasAccess) {
    const error = new Error('This conversation is unavailable.');
    error.statusCode = 403;
    throw error;
  }

  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    const [insertResult] = await connection.execute(
      `
        INSERT INTO messages (conversation_id, sender_id, message, is_read, created_at)
        VALUES (?, ?, ?, FALSE, CURRENT_TIMESTAMP)
      `,
      [safeConversationId, safeSenderId, safeMessage]
    );

    await connection.execute(
      `
        UPDATE conversations
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [safeConversationId]
    );

    const [messageRows] = await connection.execute(
      `
        SELECT id, conversation_id, sender_id, message, is_read, created_at
        FROM messages
        WHERE id = ?
        LIMIT 1
      `,
      [insertResult.insertId]
    );

    const [recipientRows] = await connection.execute(
      `
        SELECT cp.user_id AS recipient_id, u.full_name AS recipient_name
        FROM conversation_participants cp
        JOIN users u ON u.id = cp.user_id
        WHERE cp.conversation_id = ?
          AND cp.user_id <> ?
        LIMIT 1
      `,
      [safeConversationId, safeSenderId]
    );

    const [senderRows] = await connection.execute(
      `
        SELECT full_name
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [safeSenderId]
    );

    const [conversationRows] = await connection.execute(
      `
        SELECT c.item_id, c.conversation_type
        FROM conversations c
        WHERE c.id = ?
        LIMIT 1
      `,
      [safeConversationId]
    );

    const recipientId = Number(recipientRows[0]?.recipient_id || 0);

    const [unreadRows] = await connection.execute(
      `
        SELECT COUNT(*) AS unread_count
        FROM messages
        WHERE conversation_id = ?
          AND sender_id <> ?
          AND is_read = FALSE
      `,
      [safeConversationId, recipientId]
    );

    await connection.commit();

    const row = messageRows[0];

    return {
      message: {
        id: row.id,
        conversation_id: row.conversation_id,
        sender_id: row.sender_id,
        message: row.message,
        is_read: Boolean(row.is_read),
        created_at: row.created_at,
      },
      recipientId,
      recipientName: recipientRows[0]?.recipient_name || '',
      senderName: senderRows[0]?.full_name || 'A student',
      itemId: Number(conversationRows[0]?.item_id || 0),
      conversationType: conversationRows[0]?.conversation_type || CONVERSATION_TYPES.LOST_FOUND,
      recipientUnreadCount: Number(unreadRows[0]?.unread_count || 0),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  MAX_MESSAGE_LENGTH,
  CONVERSATION_TYPES,
  ensureMessagingSchema,
  createOrGetConversation,
  getConversationsForUser,
  getConversationByIdForUser,
  getConversationMessagesForUser,
  sendMessageInConversation,
  markConversationReadForUser,
  getUnreadSummaryForUser,
  assertParticipant,
};
