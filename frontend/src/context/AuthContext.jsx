import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Pre-seeded Mock Profiles for Developer Preview
export const MOCK_USERS = {
  student: {
    id: 'mock-student-101',
    name: 'Khushi Sharma',
    email: 'student@campus.edu',
    role: 'student',
    hostel: 'Tagore Hall',
    roomNumber: 'B-204',
    phone: '+91 98765 43210',
  },
  warden: {
    id: 'mock-warden-201',
    name: 'Dr. Rajesh K. Verma',
    email: 'warden@campus.edu',
    role: 'warden',
    hostel: 'Tagore Hall',
    phone: '+91 98765 43211',
  },
  staff: {
    id: 'mock-staff-301',
    name: 'Ramesh Kumar (Plumber)',
    email: 'staff@campus.edu',
    role: 'staff',
    phone: '+91 98765 43212',
  },
  admin: {
    id: 'mock-admin-401',
    name: 'Chief Admin Operator',
    email: 'admin@campus.edu',
    role: 'admin',
    phone: '+91 98765 43213',
  },
};

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

  // Check localStorage for active session on load
  useEffect(() => {
    const storedUser = localStorage.getItem('smart_campus_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('smart_campus_user');
      }
    }
    setLoading(false);
  }, []);

  // Login handler
  const login = async (email, password, requestedRole = null) => {
    setLoading(true);
    
    // Simulate API network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Simple routing to mock accounts or backend placeholder checks
    let matchedUser = null;
    
    // If a direct mock role selection was made, bypass matches
    if (requestedRole && MOCK_USERS[requestedRole]) {
      matchedUser = MOCK_USERS[requestedRole];
    } else {
      // Resolve by email matching
      const emailLower = email.toLowerCase().trim();
      if (emailLower === 'student@campus.edu') matchedUser = MOCK_USERS.student;
      else if (emailLower === 'warden@campus.edu') matchedUser = MOCK_USERS.warden;
      else if (emailLower === 'staff@campus.edu') matchedUser = MOCK_USERS.staff;
      else if (emailLower === 'admin@campus.edu') matchedUser = MOCK_USERS.admin;
    }

    if (!matchedUser) {
      setLoading(false);
      throw new Error('Invalid email, password or role. Please try again.');
    }

    setUser(matchedUser);
    localStorage.setItem('smart_campus_user', JSON.stringify(matchedUser));
    setLoading(false);
    return matchedUser;
  };

  // Logout handler
  const logout = () => {
    setUser(null);
    localStorage.removeItem('smart_campus_user');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
