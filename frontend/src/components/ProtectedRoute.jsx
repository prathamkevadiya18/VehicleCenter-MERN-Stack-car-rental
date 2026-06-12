import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// Reads the current user from localStorage and checks role-based access
function ProtectedRoute({ children, requireAdmin = false }) {
  const location = useLocation();

  const token = localStorage.getItem('authToken');
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  // If not authenticated, send to signin
  if (!token || !user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // If admin only and user is not admin, send to signin (or a 403 page if you add one)
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/signin" state={{ from: location, reason: 'not_admin' }} replace />;
  }

  return children;
}

export default ProtectedRoute;
