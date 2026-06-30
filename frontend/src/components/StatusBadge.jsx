const allowedStatuses = new Set(['active', 'resolved', 'sold']);

const StatusBadge = ({ status }) => {
  const normalizedStatus = (status || 'Active').toString().trim().toLowerCase();
  const safeStatus = allowedStatuses.has(normalizedStatus) ? normalizedStatus : 'active';
  const className = `status-badge status-${safeStatus}`;
  const label = safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);

  return <span className={className}>{label}</span>;
};

export default StatusBadge;
