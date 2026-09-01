const statusConfig = {
  pending: { label: 'Pending', className: 'claim-status-pending' },
  accepted: { label: 'Accepted', className: 'claim-status-accepted' },
  'on hold': { label: 'On Hold', className: 'claim-status-on-hold' },
  rejected: { label: 'Rejected', className: 'claim-status-rejected' },
  expired: { label: 'Expired', className: 'claim-status-expired' },
};

const ClaimStatusBadge = ({ status }) => {
  const normalizedStatus = (status || 'Pending').toString().trim().toLowerCase();
  const config = statusConfig[normalizedStatus] || statusConfig.pending;

  return <span className={`status-badge ${config.className}`}>{config.label}</span>;
};

export default ClaimStatusBadge;