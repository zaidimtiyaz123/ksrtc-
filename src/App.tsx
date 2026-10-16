import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Footer } from './components/Footer';
import { RoleGuard } from './components/RoleGuard';
import { ErrorBoundary } from './components/ErrorBoundary';

import { HomePage } from './pages/HomePage';
import { LiveTrackingPage } from './pages/LiveTrackingPage';
import { BusDetailsPage } from './pages/BusDetailsPage';
import { RouteDetailsPage } from './pages/RouteDetailsPage';
import { StopDetailsPage } from './pages/StopDetailsPage';
import { IVRSimulatorPage } from './pages/IVRSimulatorPage';
import { DriverDashboardPage } from './pages/DriverDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { PassengerDashboardPage } from './pages/PassengerDashboardPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { ReportsPage } from './pages/ReportsPage';
import { LoginPage } from './pages/LoginPage';
import { TripPlannerPage } from './pages/TripPlannerPage';

/**
 * Start Route component:
 * - If driver: navigates to Driver Cockpit ONLY
 * - If admin: displays Admin Fleet Management with all application access
 * - If passenger or unauthenticated guest: displays Public KSRTC SmartTrack Portal (HomePage)
 */
const StartRoute: React.FC = () => {
  const { user, role, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading KSRTC SmartTrack Portal...</p>
        </div>
      </div>
    );
  }

  // 1. Driver -> Driver Cockpit ONLY
  if (isAuthenticated && role === 'driver') {
    return <Navigate to="/driver" replace />;
  }

  // 2. Admin -> Full application access (Admin Fleet)
  if (isAuthenticated && role === 'admin') {
    return <AdminDashboardPage />;
  }

  // 3. User / Passenger or Guest -> Main Public Portal
  return <HomePage />;
};

// Main layout container with route-aware padding and footer behavior
function AppContent() {
  const location = useLocation();
  const isMapRoute = location.pathname.startsWith('/track');

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#E0E0E0] selection:bg-blue-600 selection:text-white font-sans antialiased">
      <Navbar />
      <div className={`flex-1 ${isMapRoute ? 'pb-0' : 'pb-16 md:pb-0'}`}>
        <ErrorBoundary>
          <Routes>
            {/* Start Route handles role dispatch */}
            <Route path="/" element={<StartRoute />} />

            {/* Public Transit Portal Views - Accessible to passengers, guests, and admin (driver locked to /driver) */}
            <Route
              path="/home"
              element={
                <RoleGuard allowedRoles={['passenger', 'admin']} requireAuth={false}>
                  <HomePage />
                </RoleGuard>
              }
            />
            <Route
              path="/planner"
              element={
                <RoleGuard allowedRoles={['passenger', 'admin']} requireAuth={false}>
                  <TripPlannerPage />
                </RoleGuard>
              }
            />
            <Route
              path="/trip-planner"
              element={
                <RoleGuard allowedRoles={['passenger', 'admin']} requireAuth={false}>
                  <TripPlannerPage />
                </RoleGuard>
              }
            />
            <Route
              path="/track"
              element={
                <RoleGuard allowedRoles={['passenger', 'admin']} requireAuth={false}>
                  <LiveTrackingPage />
                </RoleGuard>
              }
            />
            <Route
              path="/buses/:id"
              element={
                <RoleGuard allowedRoles={['passenger', 'admin']} requireAuth={false}>
                  <BusDetailsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/routes"
              element={
                <RoleGuard allowedRoles={['passenger', 'admin']} requireAuth={false}>
                  <RouteDetailsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/routes/:id"
              element={
                <RoleGuard allowedRoles={['passenger', 'admin']} requireAuth={false}>
                  <RouteDetailsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/stops"
              element={
                <RoleGuard allowedRoles={['passenger', 'admin']} requireAuth={false}>
                  <StopDetailsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/stops/:id"
              element={
                <RoleGuard allowedRoles={['passenger', 'admin']} requireAuth={false}>
                  <StopDetailsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/ivr"
              element={
                <RoleGuard allowedRoles={['passenger', 'admin']} requireAuth={false}>
                  <IVRSimulatorPage />
                </RoleGuard>
              }
            />

            {/* Authenticated Passenger Features */}
            <Route
              path="/passenger"
              element={
                <RoleGuard allowedRoles={['passenger', 'admin']} requireAuth={true}>
                  <PassengerDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RoleGuard allowedRoles={['passenger', 'admin']} requireAuth={true}>
                  <PassengerDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="/favorites"
              element={
                <RoleGuard allowedRoles={['passenger', 'admin']} requireAuth={true}>
                  <FavoritesPage />
                </RoleGuard>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleGuard allowedRoles={['passenger', 'admin']} requireAuth={true}>
                  <ReportsPage />
                </RoleGuard>
              }
            />

            {/* Driver Cockpit - accessible to driver and admin */}
            <Route
              path="/driver"
              element={
                <RoleGuard allowedRoles={['driver', 'admin']}>
                  <DriverDashboardPage />
                </RoleGuard>
              }
            />

            {/* Admin Fleet Management - accessible ONLY to admin */}
            <Route
              path="/admin"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </RoleGuard>
              }
            />

            {/* Authentication Portals */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/passenger" element={<LoginPage initialTab="passenger" />} />
            <Route path="/login/driver" element={<LoginPage initialTab="driver" />} />
            <Route path="/login/admin" element={<LoginPage initialTab="admin" />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </div>
      {!isMapRoute && <Footer />}
      <MobileBottomNav />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
