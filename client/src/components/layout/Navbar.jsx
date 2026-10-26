import React from 'react';
import { LifeBuoy, LogOut, Menu, User } from 'lucide-react';
import { Button } from '../common/Button';

export function Navbar({ currentUser, onLogout, onToggleSidebar }) {
  return (
    <header
      style={{
        height: '64px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={onToggleSidebar}
          className="btn btn-ghost"
          style={{ padding: '0.4rem', display: 'flex' }}
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--primary-glow)'
            }}
          >
            <LifeBuoy size={18} color="#fff" />
          </div>
          <span
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(to right, #fff, #94a3b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            SupportFlow
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {currentUser && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.35rem 0.75rem',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.2)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <User size={15} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {currentUser.name}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--primary)',
                  fontWeight: 600
                }}
              >
                {currentUser.role}
              </span>
            </div>
          </div>
        )}

        {currentUser && (
          <Button
            variant="ghost"
            onClick={onLogout}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            title="Log Out"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </Button>
        )}
      </div>
    </header>
  );
}
