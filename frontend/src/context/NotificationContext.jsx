import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchNotifications, markNotificationRead } from '../services/notificationService';

const NotificationContext = createContext(null);
const POLL_INTERVAL = 20000;
const MAX_TOASTS = 3;

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const knownNotificationIds = useRef(new Set());
  const initialized = useRef(false);

  const dismissToast = (notificationId) => {
    setToasts((current) => current.filter((toast) => toast.id !== notificationId));
  };

  const loadNotifications = async ({ showNewToasts = false } = {}) => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const response = await fetchNotifications({ limit: 20 });
      const nextNotifications = response.notifications || [];

      if (showNewToasts && initialized.current) {
        const newNotifications = nextNotifications.filter((notification) => !knownNotificationIds.current.has(notification.id));

        if (newNotifications.length > 0) {
          setToasts((current) => {
            const existingIds = new Set(current.map((toast) => toast.id));
            const nextToasts = newNotifications.filter((notification) => !existingIds.has(notification.id));
            return [...nextToasts, ...current].slice(0, MAX_TOASTS);
          });
        }
      }

      nextNotifications.forEach((notification) => knownNotificationIds.current.add(notification.id));
      setNotifications(nextNotifications);
      setUnreadCount(response.unreadCount || 0);
      initialized.current = true;
    } catch {
      // Existing notification surfaces display their own request errors.
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setToasts([]);
      knownNotificationIds.current = new Set();
      initialized.current = false;
      return undefined;
    }

    loadNotifications();
    const interval = setInterval(() => loadNotifications({ showNewToasts: true }), POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    const timers = toasts.map((toast) => {
      const timer = setTimeout(() => dismissToast(toast.id), 6500);
      return timer;
    });

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [toasts]);

  const handleMarkRead = async (notification) => {
    await markNotificationRead(notification.id);
    setNotifications((current) => current.map((entry) => (
      entry.id === notification.id ? { ...entry, is_read: true } : entry
    )));
    setUnreadCount((current) => Math.max(0, current - (notification.is_read ? 0 : 1)));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        dismissToast,
        loadNotifications,
        markNotificationRead: handleMarkRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
