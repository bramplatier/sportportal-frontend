import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import Dashboard from './components/dashboard/Dashboard';
import AdminPanel from './components/admin/AdminPanel';
import AccountPage from './components/account/AccountPage';
import TrainerPage from './components/trainer/TrainerPage';
import TopNav from './components/layout/TopNav';
import VotingPage from './components/voting/VotingPage';
import { getStoredUser, hasRole } from './utils/auth';

const AuthenticatedLayout = ({ children }) => (
  <>
    <TopNav />
    <main className="page-content">{children}</main>
  </>
);

const RequireAuth = ({ children }) => {
  const location = useLocation();
  const user = getStoredUser();

  if (!user) {
    const next = encodeURIComponent(location.pathname);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/admin-login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const RoleRoute = ({ children, allowedRoles = [], redirectTo = '/dashboard' }) => {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(user, allowedRoles)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/admin-login" element={<LoginForm requiredRole="admin" successPath="/admin" />} />
        <Route path="/register" element={<RegisterForm />} />

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
                  <TrainerPage />
                </RoleRoute>
              </AuthenticatedLayout>
            </RequireAuth>
          )}
        />
        <Route
          path="/admin"
          element={<AuthenticatedLayout><AdminRoute><AdminPanel /></AdminRoute></AuthenticatedLayout>}
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
