import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Inbox
} from 'lucide-react';

export function Sidebar({ currentUser, isOpen, onCloseMobile }) {
  const role = currentUser?.role || 'customer';

  const navLinks = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['customer', 'agent', 'admin']
    },
    {
      to: '/tickets',
      label: role === 'customer' ? 'My Tickets' : 'All Tickets',
      icon: Ticket,
      roles: ['customer', 'agent', 'admin']
    },
    {
      to: '/tickets?assignedTo=me',
      label: 'Assigned to Me',
      icon: Inbox,
      roles: ['agent']
    },
    {
      to: '/tickets/new',
      label: 'New Ticket',
      icon: PlusCircle,
      roles: ['customer', 'admin']
    }
  ];

  const allowedLinks = navLinks.filter((link) => link.roles.includes(role));

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--bg-overlay)',
            zIndex: 30
          }}
        />
      )}

      <aside
        style={{
          width: isOpen ? '240px' : '0px',
          minWidth: isOpen ? '240px' : '0px',
          backgroundColor: 'var(--bg-surface)',
          borderRight: isOpen ? '1px solid var(--border-subtle)' : 'none',
          height: 'calc(100vh - 64px)',
          position: 'sticky',
          top: '64px',
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'all var(--transition-normal)',
          zIndex: 35
        }}
      >
        <div style={{ padding: '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-subtle)',
              fontWeight: 700
            }}
          >
            Navigation
          </div>

          {allowedLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'var(--primary-subtle)' : 'transparent',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                  transition: 'all var(--transition-fast)'
                })}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </aside>
    </>
  );
}
