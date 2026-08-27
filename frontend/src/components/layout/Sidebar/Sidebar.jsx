import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Wrench,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({
  role = 'student', // 'student', 'warden', 'staff', 'admin'
  isOpen = true,
  isCollapsed = false,
  setCollapsed,
  onLogout
}) => {
  // Define menu links by user role
  const getNavLinks = () => {
    switch (role) {
      case 'admin':
        return [
          { to: '/admin', label: 'Overview', icon: LayoutDashboard },
          { to: '/admin/users', label: 'User Directory', icon: Users },
          { to: '/admin/analytics', label: 'Reports', icon: BarChart3 },
        ];
      case 'warden':
        return [
          { to: '/warden', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/warden/complaints', label: 'Manage Tickets', icon: FileText },
          { to: '/warden/staff', label: 'Staff Dispatch', icon: Wrench },
        ];
      case 'staff':
        return [
          { to: '/staff', label: 'Work Orders', icon: LayoutDashboard },
          { to: '/staff/complaints', label: 'My Jobs', icon: Wrench },
        ];
      case 'student':
      default:
        return [
          { to: '/student', label: 'Home Portal', icon: LayoutDashboard },
          { to: '/student/complaints', label: 'My Complaints', icon: FileText },
        ];
    }
  };

  const navLinks = getNavLinks();

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Collapse control toggle (Desktop) */}
      <button 
        className="sidebar-collapse-toggle" 
        onClick={() => setCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Header section inside dark navy sidebar */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <ShieldCheck size={26} className="logo-icon" style={{ color: 'var(--primary)' }} />
          <div className="logo-details">
            <span className="logo-text">CampusCare</span>
            <span className="logo-subtext">SMARTCAMPUS OPERATIONS</span>
          </div>
        </div>
        <div className="role-sublabel">{role} PORTAL</div>
      </div>

      {/* Navigation list */}
      <nav className="sidebar-nav">
        {navLinks.map((link) => {
          const IconComponent = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              title={isCollapsed ? link.label : ''}
            >
              <IconComponent className="link-icon" size={20} />
              <span className="link-label">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer logout shortcut inside sidebar */}
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={onLogout} title="Log Out">
          <LogOut size={20} className="link-icon" />
          <span className="link-label">Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
