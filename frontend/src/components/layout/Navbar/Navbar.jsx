import React from 'react';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import './Navbar.css';

const Navbar = ({
  user,
  onLogout,
  toggleSidebar,
  notificationCount = 0,
}) => {
  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="navbar-mobile-toggle" onClick={toggleSidebar} aria-label="Toggle Sidebar">
          <Menu size={22} />
        </button>
        <div className="navbar-brand">
          <span className="brand-accent">Smart</span>Campus
        </div>
      </div>

      <div className="navbar-right">
        {/* Notification Bell */}
        <button className="navbar-action-btn" aria-label="Notifications">
          <Bell size={20} />
          {notificationCount > 0 && <span className="notification-badge">{notificationCount}</span>}
        </button>

        {/* User Card */}
        {user && (
          <div className="navbar-user-profile">
            <div className="user-avatar">
              <User size={18} />
            </div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role-badge">{user.role}</span>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button className="navbar-logout-btn" onClick={onLogout} title="Log Out" aria-label="Log Out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
