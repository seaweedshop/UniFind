const EmptyConversations = ({ description = 'No conversations yet.' }) => {
  return (
    <div className="empty-state empty-conversations">
      <h3>No conversations yet.</h3>
      <p className="muted">{description}</p>
    </div>
  );
};

export default EmptyConversations;
