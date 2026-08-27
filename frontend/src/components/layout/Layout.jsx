import React, { useState } from 'react';
import Navbar from './Navbar/Navbar';
import Sidebar from './Sidebar/Sidebar';
import './Layout.css';

const Layout = ({
  user,
  onLogout,
  children
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer open
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop collapse

  const toggleSidebarMobile = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebarMobile = () => {
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className={`app-shell app-shell-${user?.role || 'student'} ${sidebarCollapsed ? 'app-shell-collapsed' : ''}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        role={user?.role}
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onLogout={onLogout}
      />

      {/* Mobile drawer backdrop overlay */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebarMobile} />
      )}

      {/* Main Screen layout wrapper */}
      <div className="app-main-viewport">
        <Navbar
          user={user}
          onLogout={onLogout}
          toggleSidebar={toggleSidebarMobile}
        />
        
        {/* Page Inner Content Container */}
        <main className="app-page-content" onClick={closeSidebarMobile}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
