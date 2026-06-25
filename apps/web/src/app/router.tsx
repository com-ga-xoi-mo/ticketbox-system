import { Navigate, createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { AccessDeniedPage } from '../features/auth/AccessDeniedPage';
import { AdminDashboard } from '../features/admin/dashboard/AdminDashboard';
import { AdminReportsPage } from '../features/admin/reports/AdminReportsPage';
import { OrganizerDashboard } from '../features/organizer/dashboard/OrganizerDashboard';
import { ConcertsPage as AdminConcertsPage } from '../features/admin/concerts/ConcertsPage';
import { ConcertEditPage as AdminConcertEditPage } from '../features/admin/concerts/ConcertEditPage';
import { AdminVenueMapsList, AdminVenueMapEditor } from '../features/admin/venue-maps/pages';
import { AdminAccountsPage } from '../features/admin/accounts/AdminAccountsPage';
import { ConcertsPage as OrganizerConcertsPage } from '../features/organizer/concerts/ConcertsPage';
import { ConcertEditPage as OrganizerConcertEditPage } from '../features/organizer/concerts/ConcertEditPage';
import { ConcertCreatePage as OrganizerConcertCreatePage } from '../features/organizer/concerts/ConcertCreatePage';
import { OrganizerVenueMapsList, OrganizerVenueMapEditor } from '../features/organizer/venue-maps/pages';
import { AdminAssignmentsPage } from '../features/admin/assignments/AdminAssignmentsPage';
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
        path: '/admin/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/reports',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminReportsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/organizer/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['ORGANIZER']}>
            <OrganizerDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/concerts',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminConcertsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/concerts/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminConcertEditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/venue-maps',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminVenueMapsList />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/venue-maps/:id',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminVenueMapEditor />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/assignments',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminAssignmentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/accounts',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminAccountsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/organizer/concerts',
        element: (
          <ProtectedRoute allowedRoles={['ORGANIZER']}>
            <OrganizerConcertsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/organizer/concerts/new',
        element: (
          <ProtectedRoute allowedRoles={['ORGANIZER']}>
            <OrganizerConcertCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/organizer/concerts/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={['ORGANIZER']}>
            <OrganizerConcertEditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/organizer/venue-maps',
        element: (
          <ProtectedRoute allowedRoles={['ORGANIZER']}>
            <OrganizerVenueMapsList />
          </ProtectedRoute>
        ),
      },
      {
        path: '/organizer/venue-maps/:id',
        element: (
          <ProtectedRoute allowedRoles={['ORGANIZER']}>
            <OrganizerVenueMapEditor />
          </ProtectedRoute>
        ),
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

