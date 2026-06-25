import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../../shared/auth/AuthContext';
import { useMyTickets } from '../../shared/api/tickets';
import { MyTicketsPage } from './MyTicketsPage';

vi.mock('../../shared/api/tickets', () => ({
  useMyTickets: vi.fn(),
}));

const noSession: AuthContextValue = {
  session: null,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

describe('MyTicketsPage access control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render the calendar or request tickets when unauthenticated', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/account/tickets']}>
          <AuthContext.Provider value={noSession}>
            <Routes>
              <Route path="/account/tickets" element={<MyTicketsPage />} />
              <Route path="/login" element={<div>Login page</div>} />
              <Route path="/access-denied" element={<div>Access denied</div>} />
            </Routes>
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByLabelText('Lịch vé của tôi')).not.toBeInTheDocument();
    expect(useMyTickets).not.toHaveBeenCalled();
  });
});
