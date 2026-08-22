import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, User, LogOut, CheckCheck } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import './Navbar.css';

const Navbar = ({
  user,
  onLogout,
  toggleSidebar,
}) => {
  const { notifications, markAsRead, markAllAsRead } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (n) => {
    markAsRead(n.id);
    setIsOpen(false);
    if (n.complaintId) {
      window.dispatchEvent(new CustomEvent('openComplaintDetail', { detail: { complaintId: n.complaintId } }));
    }
  };

  const formatTime = (dateInput) => {
    const date = new Date(dateInput);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
        {/* Notification Bell Container */}
        <div className="notification-container" ref={dropdownRef}>
          <button 
            className={`navbar-action-btn ${isOpen ? 'active' : ''}`} 
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          {/* Popover Dropdown panel */}
          {isOpen && (
            <div className="notification-dropdown">
              <div className="notification-dropdown-header">
                <span className="header-title">Notifications</span>
                {unreadCount > 0 && (
                  <button className="mark-all-read-btn" onClick={markAllAsRead}>
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="notification-dropdown-empty">
                    No new notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`notification-item ${!n.read ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <span className="notification-item-text">{n.message}</span>
                      <span className="notification-item-time">{formatTime(n.timestamp)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
