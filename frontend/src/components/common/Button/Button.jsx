import React from 'react';
import './Button.css';

const Button = ({
  children,
  type = 'button',
  variant = 'primary', // 'primary', 'secondary', 'outline', 'danger', 'text'
  size = 'md', // 'sm', 'md', 'lg'
  disabled = false,
  loading = false,
  onClick,
  icon: Icon,
  className = '',
  ...props
}) => {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${loading ? 'btn-loading' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="btn-spinner"></span>}
      {!loading && Icon && <Icon className="btn-icon" size={16} />}
      <span className="btn-text">{children}</span>
    </button>
  );
};

export default Button;
