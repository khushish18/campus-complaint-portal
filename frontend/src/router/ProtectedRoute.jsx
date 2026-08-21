import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  // Full-screen spinner while session recovers
  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
        <style>{`
          .spinner-container {
            display: flex;
            height: 100vh;
            align-items: center;
            justify-content: center;
            background-color: var(--bg-primary, #f8fafc);
          }
          .spinner {
            width: 36px;
            height: 36px;
            border: 3.5px solid var(--border-color, #e2e8f0);
            border-top-color: var(--primary, #6366f1);
            border-radius: 50%;
            animation: auth-spin 0.75s linear infinite;
          }
          @keyframes auth-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Render child routes
  return <Outlet />;
};

export default ProtectedRoute;
