import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  type = 'button',
  onClick,
  className = '',
  ...props
}) {
  const variantClass = `btn-${variant}`;
  const isActionDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isActionDisabled}
      onClick={onClick}
      className={`btn ${variantClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="spinner" />
      ) : Icon ? (
        <Icon size={16} />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
