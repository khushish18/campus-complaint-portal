import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import Layout from '../components/layout/Layout';

// Pages
import Landing from '../pages/Landing/Landing';
import StudentDashboard from '../pages/Dashboard/StudentDashboard';
import WardenDashboard from '../pages/Dashboard/WardenDashboard';
import StaffDashboard from '../pages/Dashboard/StaffDashboard';
import AdminDashboard from '../pages/Dashboard/AdminDashboard';
import Unauthorized from '../pages/Unauthorized';
import NotFound from '../pages/NotFound/NotFound';

// App shell layout decorator wrapper
const LayoutWrapper = () => {
  const { user, logout } = useAuth();
  return (
    <Layout user={user} onLogout={logout}>
      <Outlet />
    </Layout>
  );
};

// Route redirection helper
const HomeRedirect = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Auto-forward logged-in users to their role-specific dashboard page
  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'warden':
      return <Navigate to="/warden" replace />;
    case 'staff':
      return <Navigate to="/staff" replace />;
    case 'student':
    default:
      return <Navigate to="/student" replace />;
  }
};

const AppRouter = () => {
  return (
    <Routes>
      {/* Root forwarding routing */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Landing />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Student Route Branch */}
      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route element={<LayoutWrapper />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/complaints" element={<StudentDashboard />} />
        </Route>
      </Route>

      {/* Warden Route Branch */}
      <Route element={<ProtectedRoute allowedRoles={['warden']} />}>
        <Route element={<LayoutWrapper />}>
          <Route path="/warden" element={<WardenDashboard />} />
          <Route path="/warden/complaints" element={<WardenDashboard />} />
          <Route path="/warden/staff" element={<WardenDashboard />} />
        </Route>
      </Route>

      {/* Staff Route Branch */}
      <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
        <Route element={<LayoutWrapper />}>
          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/staff/complaints" element={<StaffDashboard />} />
        </Route>
      </Route>

      {/* Admin Route Branch */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<LayoutWrapper />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AdminDashboard />} />
        </Route>
      </Route>

      {/* Fallback 404 handler */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRouter;
