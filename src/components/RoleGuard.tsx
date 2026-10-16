import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles, requireAuth = true }) => {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Verifying KSRTC SmartTrack Credentials...</p>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated -> Redirect to Start Login Page if auth is required
  if (requireAuth && (!isAuthenticated || !user)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Driver role is strictly locked to Driver Cockpit only
  // "driver login main driver dash cockpit only"
  if (isAuthenticated && role === 'driver' && location.pathname !== '/driver') {
    return <Navigate to="/driver" replace />;
  }

  // 3. Passenger role can only see passenger views (blocked from /driver and /admin)
  // "if user login means user can see only user view"
  if (isAuthenticated && role === 'passenger') {
    if (location.pathname.startsWith('/driver') || location.pathname.startsWith('/admin')) {
      return <Navigate to="/passenger" replace />;
    }
  }

  // 4. If explicit allowedRoles is passed, enforce it
  if (isAuthenticated && allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'driver') {
      return <Navigate to="/driver" replace />;
    }
    if (role === 'passenger') {
      return <Navigate to="/passenger" replace />;
    }
  }

  // 5. Admin has unrestricted access to all routes
  // "admin login means all application access"
  return <>{children}</>;
};
