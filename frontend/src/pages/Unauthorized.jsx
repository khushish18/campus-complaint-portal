import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from '../components/common/Button/Button';
import './NotFound/NotFound.css'; // sharing identical base visual container layout

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="notfound-root">
      <div className="notfound-card">
        <ShieldAlert size={60} style={{ color: 'var(--warning)', marginBottom: '1.5rem' }} />
        <h1 className="notfound-title">403</h1>
        <h2 className="notfound-subtitle">Access Unauthorized</h2>
        <p className="notfound-text">
          Your account role does not have authorization permissions to access this dashboard.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Return to Portal
        </Button>
      </div>
    </div>
  );
};

export default Unauthorized;
