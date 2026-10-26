import React from 'react';

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed'
};

export function StatusBadge({ status, className = '' }) {
  const normalizedStatus = status ? status.toLowerCase() : 'open';
  const label = STATUS_LABELS[normalizedStatus] || normalizedStatus;
  const badgeClass = `badge badge-${normalizedStatus}`;

  return (
    <span className={`${badgeClass} ${className}`}>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor'
        }}
      />
      {label}
    </span>
  );
}
