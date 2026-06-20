import { Navigate, createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { AccessDeniedPage } from '../features/auth/AccessDeniedPage';
import { OrganizerDashboard } from '../features/dashboard/OrganizerDashboard';
import { ConcertsPage } from '../features/concerts/ConcertsPage';
import { ConcertEditPage } from '../features/concerts/ConcertEditPage';
import { ProtectedRoute } from '../shared/auth/ProtectedRoute';
import { ShellLayout } from '../shared/ui/ShellLayout';
import { useAuth } from '../shared/auth/AuthContext';
import { redirectFor } from '../shared/auth/role-access';

function RootRedirect() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={redirectFor(session)} replace />;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/no-access',
    element: <AccessDeniedPage />,
  },
  {
    element: (
      <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
        <ShellLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <OrganizerDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/concerts',
        element: <ConcertsPage />,
      },
      {
        path: '/concerts/:id/edit',
        element: <ConcertEditPage />,
      },
    ],
  },
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
