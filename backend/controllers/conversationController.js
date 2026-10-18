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



const conversationsListValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer.'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50.'),
];

const conversationCreateValidation = [
  body('item_id')
    .isInt({ min: 1 })
    .withMessage('Item id must be a valid number.'),

  body('recipient_id')
    .isInt({ min: 1 })
    .withMessage('Recipient id must be a valid number.'),
];

const conversationIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Conversation id must be a valid number.'),
];

const conversationMessagesValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Conversation id must be a valid number.'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer.'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100.'),
];



const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }

  return null;
};


const getConversations = async (req, res) => {
  const validationResponse = handleValidationErrors(req, res);

  if (validationResponse) {
    return validationResponse;
  }

  try {
    await ensureMessagingSchema();

    const page = Number.parseInt(req.query.page || '1', 10);
    const limit = Number.parseInt(req.query.limit || '20', 10);

    const result = await getConversationsForUser(req.user.id, {
      page,
      limit,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('GET /api/conversations error:', error);

    return res.status(error.statusCode || 500).json({
      message:
        error.message || 'Unable to load conversations right now.',
    });
  }
};

const createConversation = async (req, res) => {
  const validationResponse = handleValidationErrors(req, res);

  if (validationResponse) {
    return validationResponse;
  }

  try {
    await ensureMessagingSchema();

    const { item_id, recipient_id } = req.body;

    const result = await createOrGetConversation({
      itemId: item_id,
      initiatorId: req.user.id,
      recipientId: recipient_id,
    });

    return res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    console.error('POST /api/conversations error:', error);

    return res.status(error.statusCode || 500).json({
      message:
        error.message || 'Unable to create conversation right now.',
    });
  }
};



const getConversationById = async (req, res) => {
  const validationResponse = handleValidationErrors(req, res);

  if (validationResponse) {
    return validationResponse;
  }

  try {
    await ensureMessagingSchema();

    const conversationId = Number.parseInt(req.params.id, 10);

    const conversation = await getConversationByIdForUser(
      conversationId,
      req.user.id
    );

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found.',
      });
    }

    return res.status(200).json({
      conversation,
    });
  } catch (error) {
    console.error(
      `GET /api/conversations/${req.params.id} error:`,
      error
    );

    return res.status(error.statusCode || 500).json({
      message:
        error.message || 'Unable to load conversation right now.',
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/conversations/:id/messages
|--------------------------------------------------------------------------
| Get messages belonging to a conversation.
| Only conversation participants are allowed to access them.
*/

const getConversationMessages = async (req, res) => {
  const validationResponse = handleValidationErrors(req, res);

  if (validationResponse) {
    return validationResponse;
  }

  try {
    await ensureMessagingSchema();

    const conversationId = Number.parseInt(req.params.id, 10);

    const page = Number.parseInt(req.query.page || '1', 10);
    const limit = Number.parseInt(req.query.limit || '30', 10);

    const result = await getConversationMessagesForUser(
      conversationId,
      req.user.id,
      {
        page,
        limit,
      }
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error(
      `GET /api/conversations/${req.params.id}/messages error:`,
      error
    );

    return res.status(error.statusCode || 500).json({
      message:
        error.message || 'Unable to load messages right now.',
    });
  }
};

/*
|--------------------------------------------------------------------------
| PUT /api/conversations/:id/read
|--------------------------------------------------------------------------
| Mark messages in a conversation as read for the authenticated user.
*/

const markConversationRead = async (req, res) => {
  const validationResponse = handleValidationErrors(req, res);

  if (validationResponse) {
    return validationResponse;
  }

  try {
    await ensureMessagingSchema();

    const conversationId = Number.parseInt(req.params.id, 10);

    const affectedRows = await markConversationReadForUser(
      conversationId,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      affectedRows,
    });
  } catch (error) {
    console.error(
      `PUT /api/conversations/${req.params.id}/read error:`,
      error
    );

    return res.status(error.statusCode || 500).json({
      message:
        error.message || 'Unable to mark conversation as read.',
    });
  }
};



const getUnreadSummary = async (req, res) => {
  try {
    await ensureMessagingSchema();

    const result = await getUnreadSummaryForUser(req.user.id);

    return res.status(200).json(result);
  } catch (error) {
    console.error(
      'GET /api/conversations/unread/summary error:',
      error
    );

    return res.status(error.statusCode || 500).json({
      message:
        error.message || 'Unable to load unread conversation summary.',
    });
  }
};



module.exports = {
  conversationsListValidation,
  conversationCreateValidation,
  conversationIdValidation,
  conversationMessagesValidation,

  getConversations,
  createConversation,
  getConversationById,
  getConversationMessages,
  markConversationRead,
  getUnreadSummary,
};