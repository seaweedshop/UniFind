import EmptyNotifications from '../EmptyNotifications/EmptyNotifications';
import NotificationCard from '../NotificationCard/NotificationCard';

const NotificationList = ({
  notifications = [],
  loading = false,
  compact = false,
  onMarkRead,
  onDelete,
  onMarkAllRead,
  onLoadMore,
  hasMore = false,
  emptyDescription,
}) => {
  if (loading) {
    return <p className="muted">Loading notifications...</p>;
  }

  if (!notifications.length) {
    return <EmptyNotifications description={emptyDescription} />;
  }

  return (
    <div className="notification-list">
      {onMarkAllRead ? (
        <div className="notification-list-toolbar">
          <button type="button" className="btn btn-secondary btn-small" onClick={onMarkAllRead}>
            Mark all as read
          </button>
        </div>
      ) : null}

      <div className="notification-list-items">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            compact={compact}
            onMarkRead={onMarkRead}
            onDelete={onDelete}
          />
        ))}
      </div>

      {hasMore && onLoadMore ? (
        <div className="notification-list-footer">
          <button type="button" className="btn btn-secondary" onClick={onLoadMore}>
            Load More
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationList;