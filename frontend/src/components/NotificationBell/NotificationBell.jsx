import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationBadge from '../NotificationBadge/NotificationBadge';
import NotificationDropdown from '../NotificationDropdown/NotificationDropdown';
import { useNotifications } from '../../context/NotificationContext';

const NotificationBell = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loadNotifications, markNotificationRead } = useNotifications();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleToggle = () => {
    setOpen((value) => !value);
    if (!open) {
      loadNotifications({ showNewToasts: false });
    }
  };

  const handleMarkRead = async (notification) => {
    try {
      await markNotificationRead(notification);
    } catch {
      // Keep the bell resilient; the next refresh will resync state.
    }
  };

  return (
    <div className="notification-bell-wrap" ref={rootRef}>
      <button className="icon-btn notification-bell-btn" type="button" onClick={handleToggle} aria-label="Notifications">
        <span className="notification-bell-icon" aria-hidden="true">
          🔔
        </span>
        <NotificationBadge count={unreadCount} />
      </button>

      {open ? (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onViewAll={() => {
            setOpen(false);
            navigate('/notifications');
          }}
          onMarkRead={handleMarkRead}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
};

export default NotificationBell;