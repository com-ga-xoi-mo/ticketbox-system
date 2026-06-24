import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type AuthContextValue } from '../shared/auth/AuthContext';
import { PublicLayout } from '../shared/ui/layout/PublicLayout';
import { NotFoundPage } from '../features/auth/NotFoundPage';
import { AccessDeniedPage } from '../features/auth/AccessDeniedPage';
import { AudienceProtectedRoute } from '../shared/auth/AudienceProtectedRoute';
import type { Session } from '../shared/auth/AuthContext';

vi.mock('../features/concerts/EventListPage', () => ({
  EventListPage: () => <div>Event list</div>,
}));
vi.mock('../features/concerts/HomePage', () => ({
  HomePage: () => <div>Home page</div>,
}));

const noSession: AuthContextValue = { session: null, signIn: vi.fn(), signOut: vi.fn() };
const audienceSession: AuthContextValue = {
  session: { sub: 'u1', roles: ['AUDIENCE'] } satisfies Session,
  signIn: vi.fn(),
  signOut: vi.fn(),
};
const nonAudienceSession: AuthContextValue = {
  session: { sub: 'u2', roles: ['ORGANIZER'] } satisfies Session,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

function renderRoutes(
  authValue: AuthContextValue,
  initialPath: string,
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthContext.Provider value={authValue}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<div>Home page</div>} />
              <Route path="/events" element={<div>Event list</div>} />
              <Route
                path="/account"
                element={
                  <AudienceProtectedRoute>
                    <div>Account page</div>
                  </AudienceProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            <Route path="/login" element={<div>Login page</div>} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Public route/layout', () => {
  it('renders home page without a session', () => {
    renderRoutes(noSession, '/');
    expect(screen.getByText('Home page')).toBeInTheDocument();
  });

  it('renders events page without a session', () => {
    renderRoutes(noSession, '/events');
    expect(screen.getByText('Event list')).toBeInTheDocument();
  });

  it('renders not found page for unknown route', () => {
    renderRoutes(noSession, '/unknown-path');
    expect(screen.getByText(/tidak.*tồn tại|Trang không tồn tại/i)).toBeInTheDocument();
  });

  it('not found page has link back to home', () => {
    renderRoutes(noSession, '/xyz');
    expect(screen.getByRole('link', { name: /Về trang chủ/i })).toBeInTheDocument();
  });

  it('public layout renders header and footer', () => {
    renderRoutes(noSession, '/');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});

describe('Protected route access control', () => {
  it('redirects unauthenticated user from /account to /login', () => {
    renderRoutes(noSession, '/account');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders /account for AUDIENCE session', () => {
    renderRoutes(audienceSession, '/account');
    expect(screen.getByText('Account page')).toBeInTheDocument();
  });

  it('shows access denied for non-AUDIENCE authenticated user', () => {
    renderRoutes(nonAudienceSession, '/account');
    expect(screen.getAllByText(/Không có quyền truy cập/i).length).toBeGreaterThan(0);
  });

  it('access denied page has sign-out action', () => {
    renderRoutes(nonAudienceSession, '/account');
    expect(screen.getByRole('button', { name: /Đăng xuất/i })).toBeInTheDocument();
  });
});
