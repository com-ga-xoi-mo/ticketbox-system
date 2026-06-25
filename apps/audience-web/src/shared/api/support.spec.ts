import { describe, expect, it, vi } from 'vitest';
import {
  createRefundRequest,
  createSupportRequest,
  fetchRefundEligibility,
  fetchRefundRequest,
  fetchRefundRequests,
  fetchSupportRequest,
  fetchSupportRequests,
  parseSupportError,
} from './support';
import { apiGet, apiPost } from './client';

vi.mock('./client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

const timestamp = '2026-06-25T05:00:00.000Z';
const supportResponse = {
  id: 'support-1',
  userId: 'user-1',
  orderId: '11111111-1111-4111-8111-111111111111',
  ticketId: null,
  category: 'ORDER_HELP',
  status: 'OPEN',
  subject: 'Can ho tro don hang',
  message: 'Toi can ho tro ve don hang nay.',
  createdAt: timestamp,
  updatedAt: timestamp,
  statusHistory: [{ id: 'history-1', status: 'OPEN', note: null, createdAt: timestamp }],
};
const refundResponse = {
  id: 'refund-1',
  userId: 'user-1',
  orderId: '11111111-1111-4111-8111-111111111111',
  ticketId: null,
  status: 'REQUESTED',
  reason: 'CANNOT_ATTEND',
  message: 'Toi khong the tham du su kien nay.',
  requestedAmountVnd: 1200000,
  requestedTicketCount: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
  statusHistory: [{ id: 'history-2', status: 'REQUESTED', note: null, createdAt: timestamp }],
};

describe('support API', () => {
  it('fetches support request list/detail and creates a request', async () => {
    vi.mocked(apiGet).mockResolvedValueOnce([supportResponse]).mockResolvedValueOnce(supportResponse);
    vi.mocked(apiPost).mockResolvedValueOnce(supportResponse);

    await expect(fetchSupportRequests()).resolves.toHaveLength(1);
    expect(apiGet).toHaveBeenCalledWith('/me/support-requests');

    await expect(fetchSupportRequest('support-1')).resolves.toMatchObject({ id: 'support-1' });
    expect(apiGet).toHaveBeenCalledWith('/me/support-requests/support-1');

    await expect(
      createSupportRequest({
        orderId: '11111111-1111-4111-8111-111111111111',
        category: 'ORDER_HELP',
        subject: 'Can ho tro don hang',
        message: 'Toi can ho tro ve don hang nay.',
      }),
    ).resolves.toMatchObject({ id: 'support-1' });
    expect(apiPost).toHaveBeenCalledWith('/me/support-requests', expect.objectContaining({ category: 'ORDER_HELP' }));
  });

  it('fetches refund eligibility/list/detail and creates a refund request', async () => {
    vi.mocked(apiGet)
      .mockResolvedValueOnce({
        eligible: true,
        reasonCode: 'ELIGIBLE',
        message: 'Eligible',
        orderId: '11111111-1111-4111-8111-111111111111',
        ticketId: null,
        refundableAmountVnd: 1200000,
        refundableTicketCount: 1,
      })
      .mockResolvedValueOnce([refundResponse])
      .mockResolvedValueOnce(refundResponse);
    vi.mocked(apiPost).mockResolvedValueOnce(refundResponse);

    await expect(
      fetchRefundEligibility({ orderId: '11111111-1111-4111-8111-111111111111' }),
    ).resolves.toMatchObject({ eligible: true });
    expect(apiGet).toHaveBeenCalledWith(
      '/me/refund-eligibility?orderId=11111111-1111-4111-8111-111111111111',
    );

    await expect(fetchRefundRequests()).resolves.toHaveLength(1);
    await expect(fetchRefundRequest('refund-1')).resolves.toMatchObject({ id: 'refund-1' });
    await expect(
      createRefundRequest({
        orderId: '11111111-1111-4111-8111-111111111111',
        reason: 'CANNOT_ATTEND',
        message: 'Toi khong the tham du su kien nay.',
      }),
    ).resolves.toMatchObject({ id: 'refund-1' });
  });

  it('maps controlled backend errors to Vietnamese copy', () => {
    expect(parseSupportError(new Error('ORDER_NOT_PAID'))).toContain('chưa thanh toán');
    expect(parseSupportError(new Error('An active refund request already exists'))).toContain(
      'đang xử lý',
    );
    expect(parseSupportError(new Error('COOLDOWN'))).toContain('thử lại sau');
  });
});
