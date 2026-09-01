const UnreadBadge = ({ count = 0, className = '' }) => {
  if (!count) {
    return null;
  }

  return <span className={`unread-badge ${className}`.trim()}>{count > 99 ? '99+' : count}</span>;
};

export default UnreadBadge;
