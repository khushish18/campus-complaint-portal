import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

const Toast = ({
  id,
  message,
  type = 'success', // 'success', 'warning', 'danger', 'info'
  duration = 4000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="toast-icon text-success" size={20} />;
      case 'warning':
        return <AlertTriangle className="toast-icon text-warning" size={20} />;
      case 'danger':
      case 'error':
        return <AlertCircle className="toast-icon text-danger" size={20} />;
      case 'info':
      default:
        return <Info className="toast-icon text-info" size={20} />;
    }
  };

  return (
    <div className={`toast toast-${type}`} role="alert">
      {getIcon()}
      <div className="toast-message">{message}</div>
      <button className="toast-close-btn" onClick={() => onClose(id)} aria-label="Close notification">
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
