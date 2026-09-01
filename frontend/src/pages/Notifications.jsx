import { useEffect, useState } from 'react';
import EmptyNotifications from '../components/EmptyNotifications/EmptyNotifications';
import Loader from '../components/Loader';
import NotificationList from '../components/NotificationList/NotificationList';
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async (page = 1, append = false) => {
    if (page > 1) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetchNotifications({ page, limit: 10 });
      setNotifications((previous) => (append ? [...previous, ...(response.notifications || [])] : response.notifications || []));
      setCurrentPage(response.currentPage || page);
      setTotalPages(response.totalPages || 0);
      setUnreadCount(response.unreadCount || 0);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not load notifications right now.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const refreshMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  };

  const handleMarkRead = async (notification) => {
    setError('');

    try {
      await markNotificationRead(notification.id);
      setNotifications((previous) =>
        previous.map((entry) => (entry.id === notification.id ? { ...entry, is_read: true } : entry))
      );
      setUnreadCount((previous) => Math.max(0, previous - 1));
      refreshMessage('Notification marked as read.');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not update the notification.');
    }
  };

  const handleDelete = async (notification) => {
    setError('');

    try {
      await deleteNotification(notification.id);
      setNotifications((previous) => previous.filter((entry) => entry.id !== notification.id));
      if (!notification.is_read) {
        setUnreadCount((previous) => Math.max(0, previous - 1));
      }
      refreshMessage('Notification deleted.');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not delete the notification.');
    }
  };

  const handleMarkAllRead = async () => {
    setError('');

    try {
      await markAllNotificationsRead();
      setNotifications((previous) => previous.map((entry) => ({ ...entry, is_read: true })));
      setUnreadCount(0);
      refreshMessage('All notifications marked as read.');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not update notifications.');
    }
  };

  const hasMore = totalPages > currentPage;

  return (
    <section className="page-card notification-page">
      <div className="section-header section-header-row">
        <div>
          <h1>Notifications</h1>
          <p className="muted">{unreadCount > 0 ? `${unreadCount} unread notifications.` : 'No unread notifications.'}</p>
        </div>
      </div>

      {loading ? <Loader label="Loading notifications..." /> : null}
      {message ? <div className="success-alert">{message}</div> : null}
      {error ? <div className="form-alert">{error}</div> : null}

      {!loading && !error ? (
        notifications.length > 0 ? (
          <NotificationList
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
            onMarkAllRead={handleMarkAllRead}
            onLoadMore={() => loadNotifications(currentPage + 1, true)}
            hasMore={hasMore}
            loading={loadingMore}
          />
        ) : (
          <EmptyNotifications description="No notifications yet." />
        )
      ) : null}
    </section>
  );
};

export default Notifications;