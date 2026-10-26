import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../common/Button';

/**
 * Route protection and role-based access guard.
 * 
 * @param {Object} props
 * @param {string[]} [props.allowedRoles] - Optional array of authorized roles ('customer', 'agent', 'admin')
 * @param {React.ReactNode} [props.children] - Optional nested children
 */
export function ProtectedRoute({ allowedRoles, children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  // If not authenticated, redirect to login while preserving intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role restriction exists and user's role is not included
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div
        className="card animate-fade-in"
        style={{
          maxWidth: '560px',
          margin: '3rem auto',
          textAlign: 'center',
          padding: '2.5rem'
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}
        >
          <ShieldAlert size={28} />
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          Your current account role (<strong>{user?.role}</strong>) does not have permission to access this page.
          Authorized roles: {allowedRoles.join(', ')}.
        </p>
        <Button variant="primary" onClick={() => window.location.href = '/dashboard'}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
