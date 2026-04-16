import { format, parseISO, differenceInDays, isAfter, isBefore } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return format(parseISO(date), 'dd/MM/yyyy');
  } catch {
    return 'Invalid Date';
  }
};

export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  try {
    return format(parseISO(date), 'dd/MM/yyyy HH:mm');
  } catch {
    return 'Invalid Date';
  }
};

export const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  try {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    return days;
  } catch {
    return null;
  }
};

export const getCertificateStatus = (validFrom, validTo) => {
  if (!validFrom || !validTo) return 'unknown';
  
  try {
    const now = new Date();
    const from = parseISO(validFrom);
    const to = parseISO(validTo);
    
    if (isBefore(now, from)) return 'upcoming';
    if (isAfter(now, to)) return 'expired';
    
    const daysLeft = differenceInDays(to, now);
    if (daysLeft <= 30) return 'expiring';
    
    return 'valid';
  } catch {
    return 'unknown';
  }
};

export const getStatusColor = (status) => {
  const colors = {
    valid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    expiring: 'bg-amber-50 text-amber-700 border-amber-200',
    expired: 'bg-red-50 text-red-700 border-red-200',
    upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
    unknown: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return colors[status] || 'bg-slate-50 text-slate-700 border-slate-200';
};

export const getApprovalStatusColor = (status) => {
  const colors = {
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
  };
  return colors[status] || 'bg-blue-50 text-blue-700 border-blue-200';
};
