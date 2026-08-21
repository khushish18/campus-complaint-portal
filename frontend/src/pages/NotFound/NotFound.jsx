import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import Button from '../../components/common/Button/Button';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="notfound-root">
      <div className="notfound-card">
        <AlertCircle size={60} className="notfound-icon" />
        <h1 className="notfound-title">404</h1>
        <h2 className="notfound-subtitle">Page Not Found</h2>
        <p className="notfound-text">
          The page you are looking for does not exist or has been moved. Please verify the URL path or click below to return home.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Return to Portal
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
