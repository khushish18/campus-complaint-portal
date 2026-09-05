import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { io } from 'socket.io-client';
import { useToast } from './ToastContext';

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
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const toast = useToast();
  const notifiedEvents = useRef(new Set());

  const appendNotification = (message, eventName, complaintId) => {
    const newNotif = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      message,
      timestamp: new Date(),
      read: false,
      complaintId,
      type: eventName
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Socket connection lifecycle
  useEffect(() => {
    const userId = user?.id || user?._id;
    if (!userId) {
      setSocket(null);
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socketInstance = io(socketUrl);

    const onConnect = () => {
      const currentUserId = userRef.current?.id || userRef.current?._id;
      if (currentUserId) {
        console.log(`Socket connected/reconnected in AuthContext for user: ${currentUserId}`);
        socketInstance.emit('register', currentUserId);
      }
    };

    socketInstance.on('connect', onConnect);

    if (socketInstance.connected) {
      onConnect();
    }

    setSocket(socketInstance);

    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [user?.id, user?._id]);

  // Global socket notification listeners
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewComplaint = (data) => {
      if (user.role !== 'warden') return;
      const key = `newComplaint-${data.complaintId}`;
      if (notifiedEvents.current.has(key)) return;
      notifiedEvents.current.add(key);
      const msg = `A new complaint "${data.title}" has been raised in your hostel block.`;
      toast.info(msg);
      appendNotification(msg, 'newComplaint', data.complaintId);
    };

    const handleComplaintAssigned = (data) => {
      if (user.role !== 'staff') return;
      const key = `complaintAssigned-${data.complaintId}`;
      if (notifiedEvents.current.has(key)) return;
      notifiedEvents.current.add(key);
      const msg = `A new complaint "${data.title}" has been assigned to you.`;
      toast.info(msg);
      appendNotification(msg, 'complaintAssigned', data.complaintId);
    };

    const handleStatusUpdate = (data) => {
      const key = `statusUpdate-${data.complaintId}-${data.status}`;
      if (notifiedEvents.current.has(key)) return;
      notifiedEvents.current.add(key);

      let msg = '';
      if (user.role === 'student') {
        if (data.status === 'assigned') {
          msg = `Your complaint "${data.title}" has been assigned to a maintenance crew.`;
          toast.info(msg);
        } else if (data.status === 'in-progress') {
          msg = `Work has started on your complaint "${data.title}".`;
          toast.info(msg);
        } else if (data.status === 'resolved') {
          msg = `Your complaint "${data.title}" has been resolved. Please provide feedback!`;
          toast.success(msg);
        }
      } else if (user.role === 'warden') {
        msg = `Complaint "${data.title}" status updated to [${data.status.toUpperCase()}].`;
        toast.info(msg);
      }

      if (msg) {
        appendNotification(msg, 'statusUpdate', data.complaintId);
      }
    };

    const handleComplaintClosed = (data) => {
      const key = `complaintClosed-${data.complaintId}`;
      if (notifiedEvents.current.has(key)) return;
      notifiedEvents.current.add(key);

      if (user.role === 'warden' || user.role === 'staff') {
        const msg = `Complaint "${data.title || 'Work order'}" has been closed by the student (Rating: ${data.rating}/5).`;
        toast.success(msg);
        appendNotification(msg, 'complaintClosed', data.complaintId);
      }
    };

    socket.on('newComplaint', handleNewComplaint);
    socket.on('complaintAssigned', handleComplaintAssigned);
    socket.on('statusUpdate', handleStatusUpdate);
    socket.on('complaintClosed', handleComplaintClosed);

    return () => {
      socket.off('newComplaint', handleNewComplaint);
      socket.off('complaintAssigned', handleComplaintAssigned);
      socket.off('statusUpdate', handleStatusUpdate);
      socket.off('complaintClosed', handleComplaintClosed);
    };
  }, [socket, user, toast]);

  // Listen for storage events to synchronize auth state across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'smart_campus_token') {
        const inMemoryToken = api.getToken();
        if (e.newValue !== inMemoryToken) {
          if (inMemoryToken) {
            console.log('Detected external token change. Invalidating session.');
            api.setToken(null);
            setUser(null);
            setNotifications([]);
            if (!e.newValue) {
              toast.warning('Session logged out in another tab.');
            } else {
              toast.warning('Session changed in another tab. Please log in again.');
            }
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [toast]);

  // Check and restore active user session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('smart_campus_token');
      if (!token) {
        setLoading(false);
        return;
      }

      api.setToken(token); // Synchronize in-memory token first

      try {
        const response = await api.get('/auth/me');
        setUser(response.user);
      } catch (error) {
        console.error('Session recovery failed:', error.message);
        // Clear stale local storage parameters
        localStorage.removeItem('smart_campus_token');
        localStorage.removeItem('smart_campus_user');
        api.setToken(null);
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

      api.setToken(token); // Synchronize in-memory token
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

      api.setToken(token); // Synchronize in-memory token
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
      api.setToken(null); // Synchronize in-memory token
      localStorage.removeItem('smart_campus_token');
      localStorage.removeItem('smart_campus_user');
      setUser(null);
      setNotifications([]);
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
    socket,
    notifications,
    markAsRead,
    markAllAsRead,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
