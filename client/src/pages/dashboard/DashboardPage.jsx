import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  LifeBuoy,
  ShieldCheck,
  Ticket,
  PlusCircle,
  Users,
  CheckCircle2,
  Lock,
  ExternalLink,
  Activity
} from 'lucide-react';
import { authApi } from '../../api/authApi';

export function DashboardPage() {
  const { user, token, logout } = useAuth();
  const [apiResponse, setApiResponse] = useState(null);
  const [testingApi, setTestingApi] = useState(false);

  /**
   * Proves in-memory Authorization Bearer token works against protected backend endpoint.
   */
  const handleTestAuthMe = async () => {
    setTestingApi(true);
    try {
      const res = await authApi.getMe();
      setApiResponse({
        status: 'success',
        message: 'Protected endpoint GET /api/auth/me responded with 200 OK!',
        payload: res
      });
    } catch (err) {
      setApiResponse({
        status: 'error',
        message: err.message || 'API request failed'
      });
    } finally {
      setTestingApi(false);
    }
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case 'admin':
        return 'Full system authority: view system metrics, manage user roles, reassign tickets, and reopen closed tickets.';
      case 'agent':
        return 'Queue operator: triage incoming tickets, claim unassigned tickets, write internal notes, and progress tickets.';
      case 'customer':
      default:
        return 'Support requester: submit new tickets, view public updates, and collaborate with support agents.';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 27, 75, 0.7) 100%)',
          borderColor: 'rgba(99, 102, 241, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                color: 'var(--primary)',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}
            >
              Stage 9 Active
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Frontend Authentication & State Management
            </span>
          </div>

          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', fontWeight: 800 }}>
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p style={{ maxWidth: '680px', color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6' }}>
            {getRoleDescription(user?.role)}
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {user?.role !== 'agent' && (
              <Link to="/tickets/new" style={{ textDecoration: 'none' }}>
                <Button variant="primary" icon={PlusCircle}>
                  Create New Ticket
                </Button>
              </Link>
            )}
            <Link to="/tickets" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" icon={Ticket}>
                View Support Queue
              </Button>
            </Link>
            <Button
              variant="ghost"
              icon={Activity}
              onClick={handleTestAuthMe}
              loading={testingApi}
            >
              Verify Bearer Token API
            </Button>
          </div>
        </div>
      </div>

      {/* Live Token Verification feedback */}
      {apiResponse && (
        <Alert type={apiResponse.status === 'success' ? 'info' : 'error'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <strong>{apiResponse.message}</strong>
            {apiResponse.payload && (
              <pre
                style={{
                  margin: 0,
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  fontSize: '0.8rem',
                  overflowX: 'auto'
                }}
              >
                {JSON.stringify(apiResponse.payload, null, 2)}
              </pre>
            )}
          </div>
        </Alert>
      )}

      {/* User Session Profile & Security Architecture Showcase */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Active Session Info */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} color="var(--primary)" />
            <span>Authenticated Profile</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Full Name</span>
              <span style={{ fontWeight: 600 }}>{user?.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Email Address</span>
              <span style={{ fontWeight: 600 }}>{user?.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Assigned Role</span>
              <span
                style={{
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor:
                    user?.role === 'admin'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : user?.role === 'agent'
                      ? 'rgba(99, 102, 241, 0.2)'
                      : 'rgba(52, 211, 153, 0.2)',
                  color:
                    user?.role === 'admin'
                      ? 'var(--danger)'
                      : user?.role === 'agent'
                      ? 'var(--primary)'
                      : 'var(--status-resolved-text)'
                }}
              >
                {user?.role}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>User ID</span>
              <code style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.id}</code>
            </div>
          </div>
        </div>

        {/* Security Architecture Guarantees */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={20} color="var(--status-resolved-text)" />
            <span>In-Memory Security Guarantees</span>
          </h3>

          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.7' }}>
            <li>
              <strong>RAM-Only JWT:</strong> The token string is stored in a JavaScript module closure and React state.
            </li>
            <li>
              <strong>Zero Web Storage Footprint:</strong> Zero tokens in <code>localStorage</code> or <code>sessionStorage</code> prevents token theft by malicious extensions or XSS injection.
            </li>
            <li>
              <strong>Automatic 401 Interceptor:</strong> Expired sessions automatically trigger the centralized unauthorized handler and clear state.
            </li>
            <li>
              <strong>Strict RBAC Guard:</strong> Protected routes prevent unauthorized roles from accessing administrative modules.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
