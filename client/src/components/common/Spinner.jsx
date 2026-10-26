import React from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ size = 24, className = '' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
      className={className}
    >
      <Loader2 size={size} className="spinner" style={{ color: 'var(--primary)' }} />
    </div>
  );
}
