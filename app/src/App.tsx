import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import OAuthCallback from './pages/auth/OAuthCallback';
import ResetPassword from './pages/auth/ResetPassword';

// Public Pages
import LandingPage from './pages/LandingPage';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import RegistrationForm from './pages/RegistrationForm';
import PostInvite from './pages/PostInvite';

// Participant Pages
import ParticipantDashboard from './pages/participant/Dashboard';
import MyEvents from './pages/participant/MyEvents';
import MyTeam from './pages/participant/MyTeam';
import Collaboration from './pages/participant/Collaboration';
import Submission from './pages/participant/Submission';
import Leaderboard from './pages/participant/Leaderboard';

// Judge Pages
import JudgeDashboard from './pages/judge/Dashboard';
import Evaluation from './pages/judge/Evaluation';

// Organizer Pages
import OrganizerDashboard from './pages/organizer/Dashboard';
import CreateEvent from './pages/organizer/CreateEvent';
import ManageTeams from './pages/organizer/ManageTeams';
import ResultsManagement from './pages/organizer/ResultsManagement';
import Announcements from './pages/organizer/Announcements';

// 3D Town
import Town3D from './pages/Town3D';

// Support Pages
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Help from './pages/Help';

import type { UserRole } from './types';

// ─── Loading Spinner ─────────────────────────────────────────────────────────
function FullPageLoader() {
  return (
    <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyber-cyan" />
        <p className="text-cyber-gray text-sm font-mono">LOADING HACKVERSE...</p>
      </div>
    </div>
  );
}

// ─── Protected Route ─────────────────────────────────────────────────────────
function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { isLoading, isAuthenticated, profile } = useAuth();

  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/auth/signin" replace />;
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

// ─── Role-based dashboard redirect ───────────────────────────────────────────
function DashboardRedirect() {
  const { profile, isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/auth/signin" replace />;
  switch (profile?.role) {
    case 'participant': return <Navigate to="/town" replace />;
    case 'judge':       return <Navigate to="/judge/dashboard" replace />;
    case 'organizer':   return <Navigate to="/organizer/dashboard" replace />;
    default:            return <Navigate to="/" replace />;
  }
}

// ─── Post-event state: after event ends redirect participant to 3D town ───────
function PostEventRedirect() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (profile?.role === 'participant') navigate('/town', { replace: true });
  }, [profile, navigate]);
  return null;
}

// ─── Inner app (needs AuthProvider context) ──────────────────────────────────
function AppRoutes() {
  const { profile, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<EventDetail />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="help" element={<Help />} />
        </Route>

        {/* Auth Routes */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="signin" element={<SignIn />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="callback" element={<OAuthCallback />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>

        {/* Registration */}
        <Route
          path="/register/:eventId"
          element={
            <ProtectedRoute allowedRoles={['participant']}>
              <RegistrationForm />
            </ProtectedRoute>
          }
        />

        {/* Invite - anyone with link can view, must be participant to join */}
        <Route path="/invite/:code?" element={<PostInvite />} />

        {/* 3D Town - direct entry after event state, participant only */}
        <Route
          path="/town"
          element={
            <ProtectedRoute allowedRoles={['participant']}>
              <Town3D />
            </ProtectedRoute>
          }
        />

        {/* Participant Routes */}
        <Route
          path="/participant"
          element={
            <ProtectedRoute allowedRoles={['participant']}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<ParticipantDashboard />} />
          <Route path="my-events" element={<MyEvents />} />
          <Route path="team" element={<MyTeam />} />
          <Route path="collaboration" element={<Collaboration />} />
          <Route path="submission" element={<Submission />} />
        </Route>

        {/* Judge Routes */}
        <Route
          path="/judge"
          element={
            <ProtectedRoute allowedRoles={['judge']}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<JudgeDashboard />} />
          <Route path="evaluation/:submissionId?" element={<Evaluation />} />
        </Route>

        {/* Organizer Routes */}
        <Route
          path="/organizer"
          element={
            <ProtectedRoute allowedRoles={['organizer']}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<OrganizerDashboard />} />
          <Route path="create-event" element={<CreateEvent />} />
          <Route path="manage-teams" element={<ManageTeams />} />
          <Route path="results" element={<ResultsManagement />} />
          <Route path="announcements" element={<Announcements />} />
        </Route>

        {/* Common Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* Dashboard redirect (role-based) */}
        <Route path="/dashboard" element={<DashboardRedirect />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
