import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AudienceProtectedRoute } from './AudienceProtectedRoute';
import { AuthContext, type AuthContextValue } from './AuthContext';
import type { Session } from './AuthContext';

function makeSession(roles: string[]): Session {
  return { sub: 'user-1', roles: roles as Session['roles'] };
}

function renderWithSession(session: Session | null, initialPath = '/account') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
        <AuthContext.Provider value={{ session, signIn: () => {}, signOut: () => {} } satisfies AuthContextValue}>
        <Routes>
          <Route
            path="/account"
            element={
              <AudienceProtectedRoute>
                <div>Protected content</div>
              </AudienceProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/access-denied" element={<div>Access denied</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('AudienceProtectedRoute', () => {
  it('renders protected content for AUDIENCE role', () => {
    renderWithSession(makeSession(['AUDIENCE']));
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('redirects to login when unauthenticated', () => {
    renderWithSession(null);
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('redirects to access-denied for non-AUDIENCE authenticated user', () => {
    renderWithSession(makeSession(['ORGANIZER']));
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });

  it('redirects to access-denied for ADMIN without AUDIENCE role', () => {
    renderWithSession(makeSession(['ADMIN']));
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });

  it('allows AUDIENCE role regardless of other roles present', () => {
    renderWithSession(makeSession(['AUDIENCE', 'CHECKIN_STAFF']));
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('does not reference CUSTOMER role', () => {
    const routeSource = AudienceProtectedRoute.toString();
    expect(routeSource).not.toContain('CUSTOMER');
  });
});
