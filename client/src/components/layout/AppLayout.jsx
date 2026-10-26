import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function AppLayout({ currentUser, onLogout }) {
  const auth = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeUser = currentUser || auth.user;
  const handleLogout = onLogout || auth.logout;

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar
        currentUser={activeUser}
        onLogout={handleLogout}
        onToggleSidebar={toggleSidebar}
      />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar
          currentUser={currentUser}
          isOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        <main
          style={{
            flex: 1,
            padding: '2rem',
            maxWidth: '1400px',
            margin: '0 auto',
            width: '100%',
            overflowY: 'auto'
          }}
          className="animate-fade-in"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
