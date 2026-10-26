import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { LifeBuoy, ArrowRight, ShieldCheck } from 'lucide-react';

export function RegisterPage() {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    try {
      await register(name.trim(), email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    }
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
      <div style={{ width: '100%', maxWidth: '460px' }} className="animate-fade-in">
        {/* Brand Header */}
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
            Create Account
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Get started with customer ticket submission and tracking
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          {errorMsg && (
            <div style={{ marginBottom: '1.25rem' }}>
              <Alert type="error">{errorMsg}</Alert>
            </div>
          )}

          {/* Architectural role note */}
          <div style={{ marginBottom: '1.25rem' }}>
            <Alert type="info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                <ShieldCheck size={16} />
                <strong>Role-Based Access Rule</strong>
              </div>
              Public registration strictly creates <em>Customer</em> accounts. Staff roles (Agent/Admin) are provisioned securely by administrators.
            </Alert>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label className="form-label" htmlFor="reg-name">
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                className="form-input"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="reg-email">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                className="form-input"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="reg-password">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                className="form-input"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="reg-confirm">
                Confirm Password
              </label>
              <input
                id="reg-confirm"
                type="password"
                className="form-input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
            >
              <span>Create Customer Account</span>
              <ArrowRight size={16} />
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
