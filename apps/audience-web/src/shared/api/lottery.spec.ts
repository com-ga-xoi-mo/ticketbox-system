import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));

import { apiDelete, apiGet, apiPost } from './client';
import {
  fetchLotteryConfig,
  fetchLotteryRegistrations,
  fetchLotteryStatus,
  registerForLottery,
  runLotteryDrawNow,
  withdrawFromLottery,
} from './lottery';

const statusPayload = {
  ticketTypeId: '11111111-1111-1111-1111-111111111111',
  registrationId: '22222222-2222-2222-2222-222222222222',
  registrationStatus: 'REGISTERED',
  desiredQuantity: 2,
  wonQuantity: 0,
  purchasedQuantity: 0,
  remainingWonQuantity: 0,
  configStatus: 'SCHEDULED',
  registrationOpensAt: '2026-01-01T00:00:00.000Z',
  registrationClosesAt: '2026-01-10T00:00:00.000Z',
  drawAt: '2026-01-11T00:00:00.000Z',
};

const configPayload = {
  ticketTypeId: '11111111-1111-1111-1111-111111111111',
  status: 'SCHEDULED',
  registrationOpensAt: '2026-01-01T00:00:00.000Z',
  registrationClosesAt: '2026-01-10T00:00:00.000Z',
  drawAt: '2026-01-11T00:00:00.000Z',
  allocation: 2,
};

describe('lottery api client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers via POST /me/lottery and parses the status response', async () => {
    vi.mocked(apiPost).mockResolvedValue(statusPayload);
    const result = await registerForLottery({
      ticketTypeId: '11111111-1111-1111-1111-111111111111',
      desiredQuantity: 2,
    });
    expect(apiPost).toHaveBeenCalledWith('/me/lottery', {
      ticketTypeId: '11111111-1111-1111-1111-111111111111',
      desiredQuantity: 2,
    });
    expect(result.registrationStatus).toBe('REGISTERED');
  });

  it('fetches status via GET /me/lottery/status with ticketTypeId query', async () => {
    vi.mocked(apiGet).mockResolvedValue(statusPayload);
    await fetchLotteryStatus({ ticketTypeId: '11111111-1111-1111-1111-111111111111' });
    expect(apiGet).toHaveBeenCalledWith(
      '/me/lottery/status?ticketTypeId=11111111-1111-1111-1111-111111111111',
    );
  });

  it('withdraws via DELETE /me/lottery/:ticketTypeId', async () => {
    vi.mocked(apiDelete).mockResolvedValue({
      registrationId: '22222222-2222-2222-2222-222222222222',
      status: 'WITHDRAWN',
    });
    const result = await withdrawFromLottery('11111111-1111-1111-1111-111111111111');
    expect(apiDelete).toHaveBeenCalledWith('/me/lottery/11111111-1111-1111-1111-111111111111');
    expect(result.status).toBe('WITHDRAWN');
  });

  it('fetches organizer config for test controls', async () => {
    vi.mocked(apiGet).mockResolvedValue(configPayload);
    const result = await fetchLotteryConfig('11111111-1111-1111-1111-111111111111');
    expect(apiGet).toHaveBeenCalledWith(
      '/organizer/lottery/11111111-1111-1111-1111-111111111111',
    );
    expect(result.allocation).toBe(2);
  });

  it('runs manual draw via POST /organizer/lottery/:ticketTypeId/draw-now', async () => {
    vi.mocked(apiPost).mockResolvedValue({
      ticketTypeId: '11111111-1111-1111-1111-111111111111',
      granted: 1,
      notSelected: 2,
    });
    const result = await runLotteryDrawNow('11111111-1111-1111-1111-111111111111');
    expect(apiPost).toHaveBeenCalledWith(
      '/organizer/lottery/11111111-1111-1111-1111-111111111111/draw-now',
      {},
    );
    expect(result.granted).toBe(1);
  });

  it('fetches registration list via GET /organizer/lottery/:ticketTypeId/registrations', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      ticketTypeId: '11111111-1111-1111-1111-111111111111',
      registrations: [],
    });
    const result = await fetchLotteryRegistrations('11111111-1111-1111-1111-111111111111');
    expect(apiGet).toHaveBeenCalledWith(
      '/organizer/lottery/11111111-1111-1111-1111-111111111111/registrations',
    );
    expect(result.registrations).toEqual([]);
  });
});
