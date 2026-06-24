import { useNavigate, useLocation } from 'react-router-dom';
import { getToken } from '../auth/token-storage';

export function useRequireAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = Boolean(getToken());

  const redirectToLogin = (returnTo?: string) => {
    const returnPath = returnTo || location.pathname + location.search;
    navigate(`/login?returnTo=${encodeURIComponent(returnPath)}`);
  };

  return { isAuthenticated, redirectToLogin };
}
