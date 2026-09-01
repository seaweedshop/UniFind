import ConversationPreview from '../ConversationPreview/ConversationPreview';
import EmptyConversations from '../EmptyConversations/EmptyConversations';

const ConversationList = ({
  conversations = [],
  selectedConversationId = null,
  onSelectConversation,
  loading = false,
  compact = false,
  emptyDescription,
}) => {
  if (loading) {
    return <p className="muted">Loading conversations...</p>;
  }

  if (!conversations.length) {
    return <EmptyConversations description={emptyDescription} />;
  }

  return (
    <div className={`conversation-list ${compact ? 'conversation-list-compact' : ''}`.trim()}>
      {conversations.map((conversation) => (
        <ConversationPreview
          key={conversation.id}
          conversation={conversation}
          compact={compact}
          selected={conversation.id === selectedConversationId}
          onSelect={onSelectConversation}
        />
      ))}
    </div>
  );
};

export default ConversationList;
