import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import AppLayout from './components/layout/AppLayout';

// Pages
import LandingPage            from './pages/LandingPage';
import LoginPage              from './pages/LoginPage';
import RegisterPage           from './pages/RegisterPage';
import DashboardPage          from './pages/DashboardPage';
import ResumeUploadPage       from './pages/ResumeUploadPage';
import RoleSelectionPage      from './pages/RoleSelectionPage';
import InterviewSetupPage     from './pages/InterviewSetupPage';
import LiveInterviewPage      from './pages/LiveInterviewPage';
import InterviewCompletedPage from './pages/InterviewCompletedPage';
import ReportPage             from './pages/ReportPage';
import HistoryPage            from './pages/HistoryPage';
import ProfilePage            from './pages/ProfilePage';
import CodingPracticePage     from './pages/CodingPracticePage';

// Route metadata (for page titles / subtitles shown in AppLayout)
const APP_ROUTES = {
  dashboard:             { title: 'Dashboard',            subtitle: 'Your interview preparation hub' },
  resume:                { title: 'Resume Upload',         subtitle: 'Upload and analyse your resume' },
  'role-selection':      { title: 'Job Role',              subtitle: 'Select your target position' },
  'interview/setup':     { title: 'Interview Setup',       subtitle: 'Configure your practice session' },
  'interview/live':      { title: 'Live Interview',        subtitle: 'AI-powered interview in progress' },
  'interview/completed': { title: 'Interview Complete!',   subtitle: 'Generating your AI report…' },
  coding:                { title: 'Live Coding Platform',  subtitle: 'Interactive sandbox, live test cases & complexity analyzer' },
  report:                { title: 'AI Performance Report', subtitle: 'Detailed analysis of your interview' },
  history:               { title: 'Interview History',     subtitle: 'Review all your past sessions' },
  profile:               { title: 'Profile',               subtitle: 'Manage your account' },
};

function AppRoute({ routeKey }) {
  const meta = APP_ROUTES[routeKey] ?? { title: 'InterviewIQ', subtitle: '' };
  return <AppLayout pageTitle={meta.title} pageSubtitle={meta.subtitle} />;
}

/**
 * AuthGuard — redirects unauthenticated users to /login.
 * Shows a loading screen while the token is being verified on first load.
 */
function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg-page)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid var(--purple-200)',
            borderTopColor: 'var(--purple-500)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: 'var(--navy-400)', fontSize: 14 }}>Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

/**
 * GuestGuard — redirects authenticated users away from auth pages.
 */
function GuestGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public / guest-only routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login"    element={<GuestGuard><LoginPage /></GuestGuard>} />
        <Route path="/register" element={<GuestGuard><RegisterPage /></GuestGuard>} />

        {/* Protected app routes — require authentication */}
        <Route path="/dashboard" element={<AuthGuard><AppRoute routeKey="dashboard" /></AuthGuard>}>
          <Route index element={<DashboardPage />} />
        </Route>

        <Route path="/resume" element={<AuthGuard><AppRoute routeKey="resume" /></AuthGuard>}>
          <Route index element={<ResumeUploadPage />} />
        </Route>

        <Route path="/role-selection" element={<AuthGuard><AppRoute routeKey="role-selection" /></AuthGuard>}>
          <Route index element={<RoleSelectionPage />} />
        </Route>

        <Route path="/interview/setup" element={<AuthGuard><AppRoute routeKey="interview/setup" /></AuthGuard>}>
          <Route index element={<InterviewSetupPage />} />
        </Route>

        <Route path="/interview/live" element={<AuthGuard><AppRoute routeKey="interview/live" /></AuthGuard>}>
          <Route index element={<LiveInterviewPage />} />
        </Route>

        <Route path="/interview/completed" element={<AuthGuard><AppRoute routeKey="interview/completed" /></AuthGuard>}>
          <Route index element={<InterviewCompletedPage />} />
        </Route>

        <Route path="/coding" element={<AuthGuard><AppRoute routeKey="coding" /></AuthGuard>}>
          <Route index element={<CodingPracticePage />} />
        </Route>

        {/* Report: /report/:sessionId — session-specific */}
        <Route path="/report/:sessionId" element={<AuthGuard><AppRoute routeKey="report" /></AuthGuard>}>
          <Route index element={<ReportPage />} />
        </Route>

        {/* Fallback /report → history */}
        <Route path="/report" element={<Navigate to="/history" replace />} />

        <Route path="/history" element={<AuthGuard><AppRoute routeKey="history" /></AuthGuard>}>
          <Route index element={<HistoryPage />} />
        </Route>

        <Route path="/profile" element={<AuthGuard><AppRoute routeKey="profile" /></AuthGuard>}>
          <Route index element={<ProfilePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
