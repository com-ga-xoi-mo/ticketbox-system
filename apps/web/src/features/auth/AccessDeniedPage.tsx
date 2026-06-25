import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';

export function AccessDeniedPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-background bg-light-leaks flex items-center justify-center p-6">
      <div className="glass-panel rounded-xl p-8 max-w-md w-full text-center space-y-6">
        <span className="material-symbols-outlined text-5xl text-error">lock</span>
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-on-surface">Access Denied</h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Your account doesn't have access to the TicketBox web portal. Please contact your
            administrator if you believe this is a mistake.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="btn-primary w-full py-2.5 px-4 rounded-lg text-on-primary-container font-semibold text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
