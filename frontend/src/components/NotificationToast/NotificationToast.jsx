const iconByType = {
  claim: '◇',
  claim_status: '✓',
  item_status: '•',
  marketplace: '◈',
  system: 'i',
};

const formatTime = (value) => {
  if (!value) return 'Just now';
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const NotificationToast = ({ notification, onDismiss }) => {
  return (
    <article className="notification-toast" role="status">
      <div className="notification-toast-icon" aria-hidden="true">
        {iconByType[notification?.type] || iconByType.system}
      </div>
      <div className="notification-toast-content">
        <div className="notification-toast-heading">
          <strong>{notification?.title}</strong>
          <time dateTime={notification?.created_at}>{formatTime(notification?.created_at)}</time>
        </div>
        <p>{notification?.message}</p>
      </div>
      <button type="button" className="notification-toast-close" onClick={() => onDismiss(notification.id)} aria-label="Dismiss notification">
        ×
      </button>
      <span className="notification-toast-progress" aria-hidden="true" />
    </article>
  );
};

export default NotificationToast;
