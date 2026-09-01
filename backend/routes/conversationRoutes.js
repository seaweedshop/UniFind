const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/conversationController');
const {
  messageValidation,
  sendConversationMessage,
} = require('../controllers/messageController');

const router = express.Router();

router.get('/', authMiddleware, conversationsListValidation, getConversations);
router.get('/unread/summary', authMiddleware, getUnreadSummary);
router.post('/', authMiddleware, conversationCreateValidation, createConversation);
router.get('/:id', authMiddleware, conversationIdValidation, getConversationById);
router.get('/:id/messages', authMiddleware, conversationMessagesValidation, getConversationMessages);
router.post('/:id/messages', authMiddleware, conversationIdValidation, messageValidation, sendConversationMessage);
router.put('/:id/read', authMiddleware, conversationIdValidation, markConversationRead);

module.exports = router;
