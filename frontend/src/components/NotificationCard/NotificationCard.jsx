const typeConfig = {
  claim: { label: 'Claim', className: 'notification-type-claim', icon: '●' },
  claim_status: { label: 'Claim Status', className: 'notification-type-claim-status', icon: '●' },
  item_status: { label: 'Item Status', className: 'notification-type-item-status', icon: '●' },
  marketplace: { label: 'Marketplace', className: 'notification-type-marketplace', icon: '●' },
  system: { label: 'System', className: 'notification-type-system', icon: '●' },
};

const formatRelativeTime = (value) => {
  if (!value) return 'Just now';

  const timestamp = new Date(value).getTime();
  const diffInSeconds = Math.round((Date.now() - timestamp) / 1000);
  const ranges = [
    { limit: 60, label: 'second', divisor: 1 },
    { limit: 3600, label: 'minute', divisor: 60 },
    { limit: 86400, label: 'hour', divisor: 3600 },
    { limit: 604800, label: 'day', divisor: 86400 },
    { limit: 2592000, label: 'week', divisor: 604800 },
    { limit: 31536000, label: 'month', divisor: 2592000 },
  ];

  const range = ranges.find((entry) => diffInSeconds < entry.limit) || { label: 'year', divisor: 31536000 };
  const valueInUnit = Math.max(1, Math.round(diffInSeconds / range.divisor));

  if (diffInSeconds < 5) {
    return 'Just now';
  }

  return `${valueInUnit} ${range.label}${valueInUnit === 1 ? '' : 's'} ago`;
};

const NotificationCard = ({ notification, onMarkRead, onDelete, onClick, compact = false }) => {
  const config = typeConfig[notification?.type] || typeConfig.system;

  return (
    <article
      className={`notification-card ${notification?.is_read ? 'notification-card-read' : 'notification-card-unread'} ${config.className}`.trim()}
      onClick={onClick ? () => onClick(notification) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (event) => event.key === 'Enter' && onClick(notification) : undefined}
    >
      <div className="notification-card-icon" aria-hidden="true">
        {config.icon}
      </div>

      <div className="notification-card-body">
        <div className="notification-card-head">
          <div>
            <strong>{notification?.title}</strong>
            <span className="notification-type-label">{config.label}</span>
          </div>
          <span className="notification-time">{formatRelativeTime(notification?.created_at)}</span>
        </div>

        <p>{notification?.message}</p>

        {!compact ? (
          <div className="notification-card-actions">
            {!notification?.is_read && onMarkRead ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={(event) => {
                  event.stopPropagation();
                  onMarkRead(notification);
                }}
              >
                Mark as read
              </button>
            ) : null}

            {onDelete ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(notification);
                }}
              >
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {!notification?.is_read ? <span className="notification-unread-dot" aria-hidden="true" /> : null}
    </article>
  );
};

export default NotificationCard;