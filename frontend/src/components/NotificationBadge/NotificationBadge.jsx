const NotificationBadge = ({ count }) => {
  if (!count) {
    return null;
  }

  return <span className="notification-badge">{count > 99 ? '99+' : count}</span>;
};

export default NotificationBadge;