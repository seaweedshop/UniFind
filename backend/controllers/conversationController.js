const { body, param, query, validationResult } = require('express-validator');
const {
  ensureMessagingSchema,
  createOrGetConversation,
  getConversationsForUser,
  getConversationByIdForUser,
  getConversationMessagesForUser,
  markConversationReadForUser,
  getUnreadSummaryForUser,
} = require('../services/messageService');

const conversationCreateValidation = [
  body('item_id').isInt({ min: 1 }).withMessage('Item id must be a valid number.'),
  body('recipient_id').isInt({ min: 1 }).withMessage('Recipient id must be a valid number.'),
];

const conversationIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Conversation id must be a valid number.'),
];

const conversationMessagesValidation = [
  param('id').isInt({ min: 1 }).withMessage('Conversation id must be a valid number.'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
];

const conversationsListValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
];

const getConversations = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please provide valid pagination values.',
      errors: errors.array(),
    });
  }

  try {
    await ensureMessagingSchema();

    const page = req.query.page ? Number.parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : 20;
    const payload = await getConversationsForUser(req.user.id, { page, limit });

    return res.status(200).json({
      message: 'Conversations fetched successfully.',
      ...payload,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load conversations right now.' });
  }
};

const createConversation = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please provide valid conversation details.',
      errors: errors.array(),
    });
  }

  try {
    await ensureMessagingSchema();

    const result = await createOrGetConversation({
      itemId: req.body.item_id,
      initiatorId: req.user.id,
      recipientId: req.body.recipient_id,
    });

    return res.status(result.created ? 201 : 200).json({
      message: result.created ? 'Conversation created successfully.' : 'Conversation already exists.',
      created: result.created,
      conversation: result.conversation,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      message: error.message || 'Could not create the conversation.',
    });
  }
};

const getConversationById = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please provide a valid conversation id.',
      errors: errors.array(),
    });
  }

  try {
    await ensureMessagingSchema();

    const conversationId = Number.parseInt(req.params.id, 10);
    const conversation = await getConversationByIdForUser(conversationId, req.user.id);

    if (!conversation) {
      return res.status(403).json({ message: 'This conversation is unavailable.' });
    }

    return res.status(200).json({
      message: 'Conversation fetched successfully.',
      conversation,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load this conversation right now.' });
  }
};

const getConversationMessages = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please provide a valid conversation id and pagination values.',
      errors: errors.array(),
    });
  }

  try {
    await ensureMessagingSchema();

    const conversationId = Number.parseInt(req.params.id, 10);
    const page = req.query.page ? Number.parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : 30;

    const payload = await getConversationMessagesForUser(conversationId, req.user.id, { page, limit });

    return res.status(200).json({
      message: 'Messages fetched successfully.',
      ...payload,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || 'Could not load messages right now.' });
  }
};

const markConversationRead = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please provide a valid conversation id.',
      errors: errors.array(),
    });
  }

  try {
    await ensureMessagingSchema();

    const conversationId = Number.parseInt(req.params.id, 10);
    const updatedCount = await markConversationReadForUser(conversationId, req.user.id);

    return res.status(200).json({
      message: 'Conversation marked as read.',
      updatedCount,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || 'Could not update read status.' });
  }
};

const getUnreadSummary = async (req, res) => {
  try {
    await ensureMessagingSchema();

    const summary = await getUnreadSummaryForUser(req.user.id);

    return res.status(200).json({
      message: 'Unread summary fetched successfully.',
      summary,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load unread summary right now.' });
  }
};

module.exports = {
  conversationCreateValidation,
  conversationIdValidation,
  conversationMessagesValidation,
  conversationsListValidation,
  getConversations,
  createConversation,
  getConversationById,
  getConversationMessages,
  markConversationRead,
  getUnreadSummary,
};
