import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function AudienceProtectedRoute({ children }: ProtectedRouteProps) {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!session.roles.includes('AUDIENCE')) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
