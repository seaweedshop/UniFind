const statusConfig = {
  active: { label: 'Active', className: 'status-active' },
  'under claim review': { label: 'Accepted Claim In Progress', className: 'status-review' },
  resolved: { label: 'Resolved', className: 'status-resolved' },
  sold: { label: 'Resolved', className: 'status-resolved' },
};

const StatusBadge = ({ status }) => {
  const normalizedStatus = (status || 'Active').toString().trim().toLowerCase();
  const config = statusConfig[normalizedStatus] || statusConfig.active;

  return <span className={`status-badge ${config.className}`}>{config.label}</span>;
};

export default StatusBadge;
