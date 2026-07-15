import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { P2POrderTrackingPage } from './P2POrderTrackingPage';

const { apiGet, apiPost, apiPostFormData } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPostFormData: vi.fn(),
}));

vi.mock('@/shared/api/client', () => ({ apiGet, apiPost, apiPostFormData }));
vi.mock('@/shared/auth/AuthContext', () => ({
  useAuth: () => ({ session: { sub: 'buyer-1' } }),
}));

const reservedOrder = {
  id: 'order-1',
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  status: 'RESERVED',
  amountVnd: 500_000,
  bankInfo: {
    bankName: 'TicketBox Bank',
    bankAccountNumber: '0123456789',
    bankAccountName: 'NGUYEN VAN A',
  },
  paymentProofUrl: null,
  disputeReason: null,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/resale/orders/order-1']}>
        <Routes>
          <Route path="/resale/orders/:id" element={<P2POrderTrackingPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('P2POrderTrackingPage payment proof', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGet.mockResolvedValue(reservedOrder);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:payment-proof'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('uses the native file input as the entire visible bill selection control', async () => {
    const { container } = renderPage();

    await screen.findByText('Chọn ảnh bill');
    const fileInput = container.querySelector<HTMLInputElement>('#payment-proof');

    expect(fileInput).not.toBeNull();
    expect(fileInput).toBeEnabled();
    expect(fileInput).toHaveClass('absolute', 'inset-0', 'size-full', 'opacity-0');
    expect(fileInput?.parentElement).toHaveAttribute('data-slot', 'button');
  });

  it('shows the selected bill name and enables payment confirmation', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    await screen.findByText('Chọn ảnh bill');
    const fileInput = container.querySelector<HTMLInputElement>('#payment-proof');
    expect(fileInput).not.toBeNull();

    const bill = new File(['payment proof'], 'bill.png', { type: 'image/png' });
    await act(async () => {
      await user.upload(fileInput!, bill);
    });

    expect(screen.getByText('Đã chọn: bill.png')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tôi đã chuyển tiền' })).toBeEnabled();
  });
});
