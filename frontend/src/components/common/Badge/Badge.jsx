import React from 'react';
import './Badge.css';

const Badge = ({
  children,
  type, // 'success', 'warning', 'danger', 'info', 'neutral'
  status, // auto-detect type based on status string: e.g. 'pending', 'resolved', etc.
  className = '',
  ...props
}) => {
  // Auto-resolve badge variant style based on ticket status or urgency levels
  const getVariant = () => {
    if (type) return type;
    
    const key = (status || children || '').toString().toLowerCase().trim();
    switch (key) {
      case 'resolved':
      case 'success':
        return 'success';
      case 'pending':
      case 'warning':
      case 'medium':
        return 'warning';
      case 'high':
      case 'danger':
      case 'critical':
        return 'danger';
      case 'in-progress':
      case 'assigned':
      case 'info':
      case 'low':
        return 'info';
      case 'closed':
      default:
        return 'neutral';
    }
  };

  const badgeType = getVariant();

  return (
    <span className={`badge badge-${badgeType} ${className}`} {...props}>
      {children || status}
    </span>
  );
};

export default Badge;
