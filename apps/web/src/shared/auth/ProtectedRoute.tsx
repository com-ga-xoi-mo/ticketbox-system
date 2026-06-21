import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { canAccess } from './role-access';
import type { Role } from './jwt-decode';

interface Props {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: Props) {
  const { session } = useAuth();

  if (!session) return <Navigate to="/login" replace />;
  if (!canAccess(session, allowedRoles)) return <Navigate to="/no-access" replace />;

  return <>{children}</>;
}
