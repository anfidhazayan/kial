import { getApprovalStatusColor, getStatusColor } from '../utils/helpers';

const StatusBadge = ({ status, type = 'approval' }) => {
  if (type === 'approval') {
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getApprovalStatusColor(status)}`}>
        {status}
      </span>
    );
  }

  // Certificate validity status
  const statusLabels = {
    valid: 'Valid',
    expiring: 'Expiring Soon',
    expired: 'Expired',
    upcoming: 'Upcoming',
    unknown: 'Unknown',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
      {statusLabels[status] || status}
    </span>
  );
};

export default StatusBadge;
