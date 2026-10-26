import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { LifeBuoy, Shield, User, Lock, ArrowRight, Sparkles } from 'lucide-react';

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Destination to return to after login
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    }
  };

  /**
   * One-click demo credentials loader.
   */
  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMsg('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(99, 102, 241, 0.15), transparent 70%), var(--bg-app)'
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }} className="animate-fade-in">
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--primary-gradient)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--primary-glow)',
              marginBottom: '1rem'
            }}
          >
            <LifeBuoy size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Welcome back
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Sign in to access your SupportFlow workspace
          </p>
        </div>

        {/* Main Login Card */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          {errorMsg && (
            <div style={{ marginBottom: '1.25rem' }}>
              <Alert type="error">{errorMsg}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="form-label" htmlFor="email-input">
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="email-input"
                  type="email"
                  className="form-input"
                  placeholder="name@supportflow.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="password-input">
                  Password
                </label>
              </div>
              <input
                id="password-input"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
            >
              <span>Sign In</span>
              <ArrowRight size={16} />
            </Button>
          </form>

          {/* Quick-fill demo credentials */}
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              <Sparkles size={14} color="var(--primary)" />
              <span>Instant Demo Accounts</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', justifyContent: 'center' }}
                onClick={() => handleQuickFill('admin@supportflow.com', 'AdminPassword123!')}
              >
                Admin
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', justifyContent: 'center' }}
                onClick={() => handleQuickFill('agent.sarah@supportflow.com', 'AgentPassword123!')}
              >
                Agent
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', justifyContent: 'center' }}
                onClick={() => handleQuickFill('alice@example.com', 'CustomerPassword123!')}
              >
                Customer
              </button>
            </div>
          </div>
        </div>

        {/* Register prompt & Security reminder */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Need a support account?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Register as Customer
            </Link>
          </p>

          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-subtle)',
              lineHeight: '1.5',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.02)'
            }}
          >
            🔒 <strong>In-Memory Token Architecture:</strong> JWT is retained strictly in application RAM.
            Reloading the page clears memory and prompts re-login.
          </div>
        </div>
      </div>
    </div>
  );
}
