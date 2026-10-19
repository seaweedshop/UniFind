const EmptyConversations = ({ description = 'No conversations yet.', compact = false }) => {
  return (
    <div className={`empty-state empty-conversations ${compact ? 'empty-conversations-compact' : ''}`.trim()}>
      <span className="empty-state-icon" aria-hidden="true">✦</span>
      <h3>No conversations yet</h3>
      <p className="muted">{description}</p>
    </div>
  );
};

export default EmptyConversations;
