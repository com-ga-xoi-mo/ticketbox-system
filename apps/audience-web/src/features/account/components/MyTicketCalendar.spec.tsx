import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TicketSummaryResponse } from '@ticketbox/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyTicketCalendar } from './MyTicketCalendar';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function makeTicket(
  overrides: Partial<TicketSummaryResponse> = {},
): TicketSummaryResponse {
  return {
    id: 'ticket-1',
    ticketNumber: 'TCK-001',
    orderId: 'order-1',
    orderNumber: 'ORD-001',
    userId: 'user-1',
    concertId: 'concert-1',
    concertTitle: 'Đêm nhạc mùa hè',
    concertStartsAt: new Date(2099, 6, 15, 19, 30),
    ticketTypeId: 'ticket-type-1',
    ticketTypeName: 'VIP',
    ticketTypeCode: 'VIP',
    status: 'ISSUED',
    issuedAt: new Date(2099, 5, 1),
    checkedInAt: null,
    ...overrides,
  };
}

describe('MyTicketCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks a day that has a ticket', () => {
    render(<MyTicketCalendar tickets={[makeTicket()]} />);

    expect(
      screen.getByRole('button', { name: '15/7/2099, 1 vé' }),
    ).toBeInTheDocument();
  });

  it('renders a day without tickets as unmarked', () => {
    render(<MyTicketCalendar tickets={[makeTicket()]} />);

    expect(
      screen.getByRole('button', { name: '14/7/2099, không có vé' }),
    ).toBeInTheDocument();
  });

  it('navigates directly when a day has one ticket', async () => {
    const user = userEvent.setup();
    render(<MyTicketCalendar tickets={[makeTicket()]} />);

    await user.click(screen.getByRole('button', { name: '15/7/2099, 1 vé' }));

    expect(mockNavigate).toHaveBeenCalledWith('/account/tickets/ticket-1');
  });

  it('shows a short selection list when a day has multiple tickets', async () => {
    const user = userEvent.setup();
    const tickets = [
      makeTicket(),
      makeTicket({
        id: 'ticket-2',
        ticketNumber: 'TCK-002',
        concertId: 'concert-2',
        concertTitle: 'Đêm nhạc thứ hai',
        ticketTypeId: 'ticket-type-2',
        ticketTypeName: 'Standard',
        concertStartsAt: new Date(2099, 6, 15, 21, 0),
      }),
    ];

    render(<MyTicketCalendar tickets={tickets} />);

    await user.click(screen.getByRole('button', { name: '15/7/2099, 2 vé' }));

    const ticketList = screen.getByLabelText('Các vé trong ngày đã chọn');
    expect(within(ticketList).getByText('Đêm nhạc mùa hè')).toBeInTheDocument();
    expect(within(ticketList).getByText('Đêm nhạc thứ hai')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    await user.click(within(ticketList).getByRole('button', { name: /Đêm nhạc thứ hai/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/account/tickets/ticket-2');
  });
});
