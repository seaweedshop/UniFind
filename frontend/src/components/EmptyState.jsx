const EmptyState = ({ title, description, actionLabel, onAction }) => {
  return (
    <div className="empty-state page-card">
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {actionLabel && onAction ? (
        <button type="button" className="btn" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
};

export default EmptyState;
