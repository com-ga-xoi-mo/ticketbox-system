import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import { redirectFor } from '../../shared/auth/role-access';
import { registerUnauthorizedHandler } from '../../shared/api/client';
import { useLogin } from './useLogin';
import { validateLogin, hasErrors } from './login-validation';
import type { LoginErrors } from './login-validation';

export function LoginPage() {
  const navigate = useNavigate();
  const { session, login } = useAuth();
  const { mutate, isPending } = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    registerUnauthorizedHandler(() => navigate('/login', { replace: true }));
  }, [navigate]);

  useEffect(() => {
    if (session) navigate(redirectFor(session), { replace: true });
  }, [session, navigate]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validation = validateLogin(email, password);
    if (hasErrors(validation)) {
      setErrors(validation);
      return;
    }
    setErrors({});
    setApiError('');

    mutate(
      { email, password },
      {
        onSuccess: (data) => login(data.accessToken),
        onError: (err) => {
          const msg = err.message.toLowerCase();
          setApiError(
            msg.includes('unauthorized') || msg.includes('401')
              ? 'Invalid credentials. Please try again.'
              : 'Something went wrong. Please try again.',
          );
        },
      },
    );
  }

  return (
    // Full-screen bg with light-leaks; content vertically + horizontally centered
    <div
      className="text-on-surface min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundColor: '#0b1326',
        backgroundImage:
          'radial-gradient(circle at 10% 10%, rgba(189,0,255,0.18) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(255,75,137,0.15) 0%, transparent 40%)',
      }}
    >
      {/* Card: max-w-md, horizontal padding on mobile */}
      <main className="w-full max-w-md px-4 md:px-0 z-10 relative">
        <div className="glass-panel rounded-xl shadow-2xl p-10 flex flex-col items-center">
          {/* ── Logo & Brand ── */}
          <div className="mb-6 text-center flex flex-col items-center">
            <div className="w-16 h-16 mb-4 rounded-lg overflow-hidden bg-surface-container flex items-center justify-center p-1.5">
              <img src="/logo.png" alt="TicketBox Logo" className="w-full h-full object-contain" />
            </div>
            <h1
              className="font-display tracking-tighter font-extrabold text-on-surface mb-1"
              style={{ fontSize: '48px', lineHeight: '56px' }}
            >
              Ticket<span className="gradient-text">Box</span>
            </h1>
            <p className="text-base text-on-surface-variant">Manage concerts from stage to gate.</p>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4" noValidate>
            {/* Email */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="email"
                className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider"
              >
                Email Address
              </label>
              <div className="relative">
                <span
                  className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline"
                  aria-hidden="true"
                >
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="admin@ticketbox.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-dark w-full rounded-lg py-3 pl-10 pr-4 text-on-surface text-base placeholder:text-outline"
                />
              </div>
              {errors.email && <p className="text-xs text-error">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="password"
                  className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="font-label text-[10px] text-primary hover:text-primary-fixed transition-colors"
                >
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <span
                  className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline"
                  aria-hidden="true"
                >
                  lock
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark w-full rounded-lg py-3 pl-10 pr-12 text-on-surface text-base placeholder:text-outline"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide Password' : 'Show Password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
              {errors.password && <p className="text-xs text-error">{errors.password}</p>}
            </div>

            {apiError && <p className="text-sm text-error text-center">{apiError}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              aria-busy={isPending || undefined}
              className="btn-primary group mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-lg font-semibold text-on-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isPending ? (
                <svg
                  className="size-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <>
                  Sign In
                  <span
                    className="material-symbols-outlined transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          {/* ── Footer ── */}
          <div className="mt-10 w-full pt-6 border-t border-white/5 text-center">
            <p className="text-sm text-on-surface-variant">
              Don't have an account?{' '}
              <a
                href="#"
                className="text-primary hover:text-primary-fixed hover:underline font-semibold transition-colors ml-1"
              >
                Request Access
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary-container via-secondary-container to-primary-container opacity-50 z-20" />
    </div>
  );
}
