const { body, validationResult } = require('express-validator');
const { createNotification } = require('../services/notificationService');
const {
  ensureMessagingSchema,
  sendMessageInConversation,
  MAX_MESSAGE_LENGTH,
} = require('../services/messageService');

const messageValidation = [
  body('message')
    .isString()
    .withMessage('Message must be text.')
    .trim()
    .notEmpty()
    .withMessage('Message cannot be empty.')
    .isLength({ max: MAX_MESSAGE_LENGTH })
    .withMessage(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`),
];

const directMessageValidation = [
  body('conversation_id').isInt({ min: 1 }).withMessage('Conversation id must be a valid number.'),
  ...messageValidation,
];

const emitMessage = (req, conversationId, payload) => {
  const io = req.app.get('io');

  if (!io) {
    return;
  }

  io.to(`conversation:${conversationId}`).emit('message:new', {
    conversationId,
    message: payload.message,
  });
};

const maybeCreateNotification = async (payload) => {
  if (!payload.recipientId || payload.recipientUnreadCount !== 1) {
    return;
  }

  const title = `New message from ${payload.senderName}`;
  const preview = payload.message.message.length > 110
    ? `${payload.message.message.slice(0, 107)}...`
    : payload.message.message;

  await createNotification(
    payload.recipientId,
    title,
    preview,
    'system',
    payload.itemId || null,
    null
  );
};

const sendConversationMessage = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please provide a valid message.',
      errors: errors.array(),
    });
  }

  try {
    await ensureMessagingSchema();

    const conversationId = Number.parseInt(req.params.id, 10);
    const payload = await sendMessageInConversation({
      conversationId,
      senderId: req.user.id,
      message: req.body.message,
    });

    emitMessage(req, conversationId, payload);
    await maybeCreateNotification(payload);

    return res.status(201).json({
      message: 'Message sent successfully.',
      sentMessage: payload.message,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      message: error.message || 'Message could not be sent.',
    });
  }
};

const sendMessage = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please provide valid message details.',
      errors: errors.array(),
    });
  }

  try {
    await ensureMessagingSchema();

    const conversationId = Number.parseInt(req.body.conversation_id, 10);
    const payload = await sendMessageInConversation({
      conversationId,
      senderId: req.user.id,
      message: req.body.message,
    });

    emitMessage(req, conversationId, payload);
    await maybeCreateNotification(payload);

    return res.status(201).json({
      message: 'Message sent successfully.',
      sentMessage: payload.message,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      message: error.message || 'Message could not be sent.',
    });
  }
};

module.exports = {
  messageValidation,
  directMessageValidation,
  sendConversationMessage,
  sendMessage,
};
