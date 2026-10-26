import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const ICONS = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info
};

export function Alert({ type = 'error', message, children, className = '' }) {
  const Icon = ICONS[type] || AlertCircle;
  const content = message || children;

  if (!content) return null;

  return (
    <div className={`alert alert-${type} ${className}`} role="alert">
      <Icon size={18} style={{ flexShrink: 0 }} />
      <div>{content}</div>
    </div>
  );
}
