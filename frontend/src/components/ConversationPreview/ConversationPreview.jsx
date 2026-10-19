import UnreadBadge from '../UnreadBadge/UnreadBadge';

const formatRelativeTime = (value) => {
  if (!value) return 'Just now';

  const timestamp = new Date(value).getTime();
  const diffInSeconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000));

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) {
    const minutes = Math.round(diffInSeconds / 60);
    return `${minutes} min ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.round(diffInSeconds / 3600);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.round(diffInSeconds / 86400);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const avatarInitial = (name) => (name ? name.trim().slice(0, 1).toUpperCase() : 'S');

const ConversationPreview = ({
  conversation,
  selected = false,
  compact = false,
  onSelect,
}) => {
  const previewMessage = conversation?.last_message?.message || 'No messages yet.';
  const previewTimestamp = conversation?.last_message?.created_at || conversation?.updated_at;

  return (
    <button
      type="button"
      className={`conversation-preview ${selected ? 'conversation-preview-active' : ''}`.trim()}
      onClick={() => onSelect?.(conversation)}
    >
      <div className="conversation-avatar" aria-hidden="true">
        {avatarInitial(conversation?.other_user?.full_name)}
      </div>

      <div className="conversation-preview-main">
        <div className="conversation-preview-head">
          <strong>{conversation?.other_user?.full_name || 'Student'}</strong>
          <span className="conversation-preview-time">{formatRelativeTime(previewTimestamp)}</span>
        </div>

        <p className="conversation-preview-item">{conversation?.item?.title || 'Unknown Item'}</p>

        <p className="conversation-preview-message">{previewMessage}</p>
      </div>

      {compact ? (
        conversation?.unread_count > 0 ? <span className="conversation-unread-dot" aria-label="Unread messages" /> : null
      ) : <UnreadBadge count={conversation?.unread_count || 0} />}
    </button>
  );
};

export default ConversationPreview;
