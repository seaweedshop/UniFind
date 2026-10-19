const statusConfig = {
  active: { label: 'Active', className: 'status-active' },
  'under claim review': { label: 'Accepted Claim In Progress', className: 'status-review' },
  resolved: { label: 'Resolved', className: 'status-resolved' },
  sold: { label: 'Resolved', className: 'status-resolved' },
};

const StatusBadge = ({ status, itemType }) => {
  const normalizedStatus = (status || 'Active').toString().trim().toLowerCase();

  if (itemType === 'sell') {
    const isSold = normalizedStatus === 'resolved' || normalizedStatus === 'sold';

    return (
      <span className={`status-badge ${isSold ? 'status-sold' : 'status-available'}`}>
        {isSold ? 'Sold' : 'Available'}
      </span>
    );
  }

  const config = statusConfig[normalizedStatus] || statusConfig.active;

  return <span className={`status-badge ${config.className}`}>{config.label}</span>;
};

export default StatusBadge;
