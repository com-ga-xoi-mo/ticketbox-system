import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WaitingRoomStatusResponse } from '@ticketbox/api-types';

import { CheckoutPage } from './CheckoutPage';
import * as ordersApi from '../../shared/api/orders';
import * as waitingRoomApi from '../../shared/api/waiting-room';

vi.mock('../../shared/api/client', () => ({
  apiPost: vi.fn(),
}));

vi.mock('../../shared/api/orders', async () => {
  const actual =
    await vi.importActual<typeof import('../../shared/api/orders')>(
      '../../shared/api/orders',
    );
  return {
    ...actual,
    createOrder: vi.fn(),
    initiatePayment: vi.fn(),
    validatePromoCode: vi.fn(),
  };
});

vi.mock('../../shared/api/waiting-room', () => ({
  fetchWaitingRoomStatus: vi.fn(),
  joinWaitingRoom: vi.fn(),
  leaveWaitingRoom: vi.fn(),
  mintWaitingRoomStreamToken: vi.fn(),
  openWaitingRoomStream: vi.fn(),
}));

const checkoutState = {
  concertId: 'concert-1',
  concertSlug: 'concert-1',
  concertTitle: 'Concert 1',
  quantities: [['ticket-type-1', 1]] as [string, number][],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/checkout', state: checkoutState }]}>
      <Routes>
        <Route path="/checkout" element={<CheckoutPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function findButton(container: HTMLElement, labelPart: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((item) =>
    item.textContent?.includes(labelPart),
  );
  if (!button) throw new Error(`Button containing "${labelPart}" not found`);
  return button;
}

describe('CheckoutPage waiting-room flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('ticketbox_audience_token', 'test-token');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('joins the waiting room instead of creating an order when the room is active', async () => {
    vi.mocked(waitingRoomApi.fetchWaitingRoomStatus).mockResolvedValue({
      concertId: 'concert-1',
      userId: 'user-1',
      active: true,
      status: 'WAITING',
      position: 5,
      admissionToken: null,
      admissionExpiresAt: null,
    });
    vi.mocked(waitingRoomApi.joinWaitingRoom).mockResolvedValue({
      concertId: 'concert-1',
      userId: 'user-1',
      active: true,
      status: 'WAITING',
      position: 3,
      admissionToken: null,
      admissionExpiresAt: null,
    });
    vi.mocked(waitingRoomApi.mintWaitingRoomStreamToken).mockResolvedValue(
      'stream-token',
    );
    vi.mocked(waitingRoomApi.openWaitingRoomStream).mockReturnValue({
      close: vi.fn(),
    } as never);

    const { container } = renderPage();
    await userEvent.click(findButton(container, 'X'));

    await waitFor(() => {
      expect(waitingRoomApi.joinWaitingRoom).toHaveBeenCalledWith('concert-1');
    });
    expect(ordersApi.createOrder).not.toHaveBeenCalled();
    expect(container.textContent).toContain('#3');
  });

  it('updates from SSE admission and submits checkout with the admission token', async () => {
    let pushStatus:
      | ((status: WaitingRoomStatusResponse) => void)
      | undefined;

    vi.mocked(waitingRoomApi.fetchWaitingRoomStatus).mockResolvedValue({
      concertId: 'concert-1',
      userId: 'user-1',
      active: true,
      status: 'WAITING',
      position: 1,
      admissionToken: null,
      admissionExpiresAt: null,
    });
    vi.mocked(waitingRoomApi.joinWaitingRoom).mockResolvedValue({
      concertId: 'concert-1',
      userId: 'user-1',
      active: true,
      status: 'WAITING',
      position: 1,
      admissionToken: null,
      admissionExpiresAt: null,
    });
    vi.mocked(waitingRoomApi.mintWaitingRoomStreamToken).mockResolvedValue(
      'stream-token',
    );
    vi.mocked(waitingRoomApi.openWaitingRoomStream).mockImplementation((input) => {
      pushStatus = input.onStatus;
      return { close: vi.fn() } as never;
    });
    vi.mocked(ordersApi.createOrder).mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-001',
      userId: 'user-1',
      concertId: 'concert-1',
      status: 'PENDING_PAYMENT',
      subtotalVnd: 100_000,
      discountAmountVnd: 0,
      serviceFeeVnd: 0,
      totalAmountVnd: 100_000,
      reservationExpiresAt: '2026-07-09T01:20:00.000Z',
      createdAt: '2026-07-09T01:00:00.000Z',
      updatedAt: '2026-07-09T01:00:00.000Z',
      items: [],
    } as never);

    const { container } = renderPage();
    await userEvent.click(findButton(container, 'X'));
    await waitFor(() => expect(pushStatus).toBeDefined());

    act(() => {
      pushStatus?.({
        concertId: 'concert-1',
        userId: 'user-1',
        active: true,
        status: 'ADMITTED',
        position: 0,
        admissionToken: 'admission-token',
        admissionExpiresAt: '2026-07-09T01:15:00.000Z',
      });
    });

    await userEvent.click(findButton(container, 'Ti'));

    await waitFor(() => {
      expect(ordersApi.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          waitingRoomAdmissionToken: 'admission-token',
        }),
      );
    });
  });

  it('maps waiting-room checkout errors to a queue message', async () => {
    vi.mocked(waitingRoomApi.fetchWaitingRoomStatus).mockResolvedValue({
      concertId: 'concert-1',
      userId: 'user-1',
      active: false,
      status: 'INACTIVE',
      position: null,
      admissionToken: null,
      admissionExpiresAt: null,
    });
    vi.mocked(ordersApi.createOrder).mockRejectedValue(
      new Error('Waiting room admission is required'),
    );

    const { container } = renderPage();
    await userEvent.click(findButton(container, 'X'));

    await waitFor(() => {
      expect(container.textContent).toContain('ph');
      expect(container.textContent).toContain('ch');
    });
  });
});
