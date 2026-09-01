const ChatHeader = ({ conversation, onBack }) => {
  if (!conversation) {
    return null;
  }

  const itemTypeLabel = conversation?.item?.item_type === 'sell'
    ? 'Marketplace'
    : conversation?.item?.item_type === 'found'
      ? 'Found Item'
      : 'Lost Item';

  return (
    <header className="chat-header">
      <button type="button" className="btn btn-secondary chat-back-btn" onClick={onBack}>
        Back
      </button>

      <div>
        <h2>{conversation?.other_user?.full_name || 'Student'}</h2>
        <p className="muted">
          {conversation?.item?.title || 'Unknown Item'} · {itemTypeLabel}
        </p>
      </div>
    </header>
  );
};

export default ChatHeader;
