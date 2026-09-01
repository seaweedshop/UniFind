const EmptyNotifications = ({ title = 'No notifications yet.', description }) => {
  return (
    <div className="empty-state notification-empty">
      <h3>{title}</h3>
      {description ? <p className="muted">{description}</p> : null}
    </div>
  );
};

export default EmptyNotifications;