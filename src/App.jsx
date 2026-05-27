import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import LoginForm from './components/auth/LoginForm';
// import RegisterForm from './components/auth/RegisterForm';
import Dashboard from './components/dashboard/Dashboard';
import AdminPanel from './components/admin/AdminPanel';
import AccountPage from './components/account/AccountPage';
import TrainerPage from './components/trainer/TrainerPage';
import TopNav from './components/layout/TopNav';
import VotingPage from './components/voting/VotingPage';
import { hasCapability, hasRole } from './utils/auth';
import { AuthProvider, useAuth } from './context/AuthContext';

const AuthenticatedLayout = ({ children }) => (
  <>
    <TopNav />
    <main className="page-content">{children}</main>
  </>
);

const RequireAuth = ({ children }) => {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Laden...</div>;
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
};

const CapabilityRoute = ({ children, capability, redirectTo = '/dashboard' }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Laden...</div>;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasCapability(user, capability)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

const RoleRoute = ({ children, allowedRoles = [], redirectTo = '/dashboard' }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Laden...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(user, allowedRoles)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

const AuthCallback = () => {
  const { fetchUser, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [loading, user, navigate]);

  return <div>Sessie bevestigen...</div>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/admin-login" element={<LoginForm requiredRole="admin" successPath="/admin" />} />
      {/* <Route path="/register" element={<RegisterForm />} /> */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/dashboard"
        element={<RequireAuth><AuthenticatedLayout><Dashboard /></AuthenticatedLayout></RequireAuth>}
      />
      <Route
        path="/account"
        element={<RequireAuth><AuthenticatedLayout><AccountPage /></AuthenticatedLayout></RequireAuth>}
      />
      <Route
        path="/activiteiten"
        element={<RequireAuth><AuthenticatedLayout><VotingPage /></AuthenticatedLayout></RequireAuth>}
      />
      <Route
        path="/trainer"
        element={(
          <RequireAuth>
            <AuthenticatedLayout>
              <RoleRoute allowedRoles={['trainer', 'admin']}>
                <CapabilityRoute capability="trainer.sessions.view">
                <TrainerPage />
                </CapabilityRoute>
              </RoleRoute>
            </AuthenticatedLayout>
          </RequireAuth>
        )}
      />
      <Route
        path="/admin"
        element={(
          <RequireAuth>
            <AuthenticatedLayout>
              <RoleRoute allowedRoles={['admin']}>
                <CapabilityRoute capability="admin.users.view">
                  <AdminPanel />
                </CapabilityRoute>
              </RoleRoute>
            </AuthenticatedLayout>
          </RequireAuth>
        )}
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
