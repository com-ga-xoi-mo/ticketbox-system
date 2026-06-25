import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMyTickets } from '../../../shared/api/tickets';
import {
  AuthContext,
  type AuthContextValue,
} from '../../../shared/auth/AuthContext';
import { HomeTicketCalendarWidget } from './HomeTicketCalendarWidget';

vi.mock('../../../shared/api/tickets', () => ({
  useMyTickets: vi.fn(),
}));

const noSession: AuthContextValue = {
  session: null,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

const audienceSession: AuthContextValue = {
  session: { sub: 'user-1', roles: ['AUDIENCE'] },
  signIn: vi.fn(),
  signOut: vi.fn(),
};

describe('HomeTicketCalendarWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render or request tickets for a guest', () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={noSession}>
          <HomeTicketCalendarWidget />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.queryByLabelText('Lịch vé trên trang chủ')).not.toBeInTheDocument();
    expect(useMyTickets).not.toHaveBeenCalled();
  });

  it('renders the calendar on Home for an authenticated audience', () => {
    vi.mocked(useMyTickets).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    render(
      <MemoryRouter>
        <AuthContext.Provider value={audienceSession}>
          <HomeTicketCalendarWidget />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Lịch vé trên trang chủ')).toBeInTheDocument();
    expect(screen.getByLabelText('Lịch vé của tôi')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Xem tất cả vé của tôi' }),
    ).toHaveAttribute('href', '/account/tickets');
  });
});
