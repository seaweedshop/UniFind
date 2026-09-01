import ChatHeader from '../ChatHeader/ChatHeader';
import MessageBubble from '../MessageBubble/MessageBubble';
import MessageInput from '../MessageInput/MessageInput';

const ChatWindow = ({
  user,
  conversation,
  messages = [],
  loading = false,
  sending = false,
  error = '',
  hasMore = false,
  loadingMore = false,
  onBack,
  onSend,
  onLoadMore,
}) => {
  if (!conversation) {
    return (
      <div className="chat-window chat-window-empty">
        <p className="muted">Select a conversation to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <ChatHeader conversation={conversation} onBack={onBack} />

      {error ? <div className="form-alert">{error}</div> : null}

      <div className="chat-messages" role="log" aria-live="polite">
        {hasMore ? (
          <div className="chat-load-more-row">
            <button type="button" className="btn btn-secondary" onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        ) : null}

        {loading ? <p className="muted">Loading messages...</p> : null}

        {!loading && !messages.length ? <p className="muted">No messages yet. Start the conversation.</p> : null}

        {!loading
          ? messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={Number(message.sender_id) === Number(user?.id)}
              />
            ))
          : null}
      </div>

      <MessageInput onSend={onSend} disabled={sending} />
    </div>
  );
};

export default ChatWindow;
