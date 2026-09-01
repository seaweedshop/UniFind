const { validationResult } = require('express-validator');
const {
  ensureNotificationsSchema,
  getNotificationsForUser,
  getNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = require('../services/notificationService');

const getNotifications = async (req, res) => {
  try {
    await ensureNotificationsSchema();

    const page = req.query.page ? Number.parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : 20;
    const notifications = await getNotificationsForUser(req.user.id, { page, limit });

    return res.status(200).json({
      message: 'Notifications fetched successfully.',
      ...notifications,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load notifications right now.' });
  }
};

const readNotification = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please provide a valid notification id.',
      errors: errors.array(),
    });
  }

  try {
    await ensureNotificationsSchema();
    const notificationId = Number.parseInt(req.params.id, 10);
    const notification = await getNotificationById(notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only manage your own notifications.' });
    }

    await markNotificationRead(notificationId, req.user.id);

    return res.status(200).json({ message: 'Notification marked as read.' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update the notification right now.' });
  }
};

const readAllNotifications = async (req, res) => {
  try {
    await ensureNotificationsSchema();
    const updatedCount = await markAllNotificationsRead(req.user.id);

    return res.status(200).json({
      message: 'All notifications marked as read.',
      updatedCount,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update notifications right now.' });
  }
};

const removeNotification = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please provide a valid notification id.',
      errors: errors.array(),
    });
  }

  try {
    await ensureNotificationsSchema();
    const notificationId = Number.parseInt(req.params.id, 10);
    const notification = await getNotificationById(notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only manage your own notifications.' });
    }

    await deleteNotification(notificationId, req.user.id);

    return res.status(200).json({ message: 'Notification deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete the notification right now.' });
  }
};

module.exports = {
  getNotifications,
  readNotification,
  readAllNotifications,
  removeNotification,
};