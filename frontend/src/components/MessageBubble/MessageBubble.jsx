const formatTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MessageBubble = ({ message, isOwnMessage }) => {
  return (
    <article className={`message-bubble ${isOwnMessage ? 'message-bubble-own' : 'message-bubble-other'}`.trim()}>
      <p>{message?.message || ''}</p>
      <span>{formatTime(message?.created_at)}</span>
    </article>
  );
};

export default MessageBubble;
