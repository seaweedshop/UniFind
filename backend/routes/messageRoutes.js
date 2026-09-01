const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  directMessageValidation,
  sendMessage,
} = require('../controllers/messageController');

const router = express.Router();

router.post('/', authMiddleware, directMessageValidation, sendMessage);

module.exports = router;
