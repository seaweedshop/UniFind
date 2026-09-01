const express = require('express');
const { param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getNotifications,
  readNotification,
  readAllNotifications,
  removeNotification,
} = require('../controllers/notificationController');

const router = express.Router();

const notificationIdValidation = [param('id').isInt({ min: 1 }).withMessage('Notification id must be a valid number.')];

router.get('/', authMiddleware, getNotifications);
router.put('/read-all', authMiddleware, readAllNotifications);
router.put('/:id/read', authMiddleware, notificationIdValidation, readNotification);
router.delete('/:id', authMiddleware, notificationIdValidation, removeNotification);

module.exports = router;