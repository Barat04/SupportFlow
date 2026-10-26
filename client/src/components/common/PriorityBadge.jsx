import React from 'react';

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
};

export function PriorityBadge({ priority, className = '' }) {
  const normalized = priority ? priority.toLowerCase() : 'medium';
  const label = PRIORITY_LABELS[normalized] || normalized;
  const badgeClass = `badge badge-${normalized}`;

  return <span className={`${badgeClass} ${className}`}>{label}</span>;
}
