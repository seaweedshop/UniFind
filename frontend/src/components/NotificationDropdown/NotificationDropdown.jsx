import EmptyNotifications from '../EmptyNotifications/EmptyNotifications';
import NotificationCard from '../NotificationCard/NotificationCard';

const NotificationDropdown = ({ notifications = [], unreadCount = 0, onViewAll, onMarkRead, onClose }) => {
  return (
    <div className="notification-dropdown" onClick={(event) => event.stopPropagation()}>
      <div className="notification-dropdown-header">
        <div>
          <h3>Notifications</h3>
          <p className="muted">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
        </div>
        {onViewAll ? (
          <button type="button" className="btn btn-secondary btn-small" onClick={onViewAll}>
            View All
          </button>
        ) : null}
      </div>

      <div className="notification-dropdown-body">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              compact
              onClick={(selectedNotification) => {
                if (!selectedNotification.is_read && onMarkRead) {
                  onMarkRead(selectedNotification);
                }

                if (onClose) {
                  onClose();
                }
              }}
            />
          ))
        ) : (
          <EmptyNotifications />
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;