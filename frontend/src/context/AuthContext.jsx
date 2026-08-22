import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check and restore active user session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('smart_campus_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.user);
      } catch (error) {
        console.error('Session recovery failed:', error.message);
        // Clear stale local storage parameters
        localStorage.removeItem('smart_campus_token');
        localStorage.removeItem('smart_campus_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Login handler with support for quick demo role redirects
  const login = async (email, password, requestedRole = null) => {
    setLoading(true);

    let loginEmail = email;
    let loginPassword = password;

    // Resolve credentials for quick demo buttons using pre-seeded values
    if (requestedRole) {
      if (requestedRole === 'student') loginEmail = 'student@campus.edu';
      else if (requestedRole === 'warden') loginEmail = 'warden@campus.edu';
      else if (requestedRole === 'staff') loginEmail = 'staff@campus.edu';
      else if (requestedRole === 'admin') loginEmail = 'admin@campus.edu';
      
      loginPassword = 'password123';
    }

    try {
      const response = await api.post('/auth/login', { email: loginEmail, password: loginPassword });
      const { token, user: loggedUser } = response;

      localStorage.setItem('smart_campus_token', token);
      localStorage.setItem('smart_campus_user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      return loggedUser;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register student handler
  const register = async (name, email, password, roomNo, hostelBlock) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        roomNo,
        hostelBlock,
      });
      const { token, user: loggedUser } = response;

      localStorage.setItem('smart_campus_token', token);
      localStorage.setItem('smart_campus_user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      return loggedUser;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout').catch(() => {});
    } finally {
      localStorage.removeItem('smart_campus_token');
      localStorage.removeItem('smart_campus_user');
      setUser(null);
      setLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
