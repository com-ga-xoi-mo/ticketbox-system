// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ session: null as { sub: string; roles: string[] } | null }));
vi.mock('../../../shared/auth/AuthContext', () => ({
  useAuth: () => ({ session: auth.session, login: vi.fn(), logout: vi.fn() }),
}));

import { ProtectedRoute } from '../../../shared/auth/ProtectedRoute';

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/admin/concerts/concert-1/guest-list']}>
      <Routes>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/no-access" element={<div>Access denied</div>} />
        <Route
          path="/admin/concerts/:id/guest-list"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <div>Guest-list management</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Admin guest-list route access', () => {
  beforeEach(() => {
    auth.session = null;
  });

  it('redirects unauthenticated actors to login', () => {
    renderRoute();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('denies ORGANIZER and admits ADMIN', () => {
    auth.session = { sub: 'organizer', roles: ['ORGANIZER'] };
    const view = renderRoute();
    expect(screen.getByText('Access denied')).toBeInTheDocument();
    view.unmount();
    auth.session = { sub: 'admin', roles: ['ADMIN'] };
    renderRoute();
    expect(screen.getByText('Guest-list management')).toBeInTheDocument();
  });
});
