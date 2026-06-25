import { ConcertStatus, OrderStatus } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../../platform/database/prisma.service';
import { fillRevenueTrend, normalizeWindowDays } from './dashboard-analytics.helpers';
import { GetAdminDashboardMetricsUseCase } from './get-admin-dashboard-metrics.use-case';
import { GetOrganizerDashboardMetricsUseCase } from './get-organizer-dashboard-metrics.use-case';

function prismaWith(overrides: unknown): PrismaService {
  return overrides as PrismaService;
}

describe('dashboard analytics helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes analytics windows to the supported range', () => {
    expect(normalizeWindowDays(undefined)).toBe(30);
    expect(normalizeWindowDays(0)).toBe(1);
    expect(normalizeWindowDays(14)).toBe(14);
    expect(normalizeWindowDays(120)).toBe(90);
  });

  it('fills missing daily revenue trend dates with zeroes', () => {
    expect(
      fillRevenueTrend(3, [{ date: '2026-06-24', revenueVnd: '150000', paidOrders: 2n }]),
    ).toEqual([
      { date: '2026-06-23', revenueVnd: 0, paidOrders: 0 },
      { date: '2026-06-24', revenueVnd: 150000, paidOrders: 2 },
      { date: '2026-06-25', revenueVnd: 0, paidOrders: 0 },
    ]);
  });
});

describe('GetAdminDashboardMetricsUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aggregates platform revenue, active concerts, trend, and top grossing concerts', async () => {
    const prisma = prismaWith({
      order: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { totalAmountVnd: 900000 } }),
      },
      concert: {
        count: vi.fn().mockResolvedValue(4),
      },
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ date: '2026-06-24', revenueVnd: 300000n, paidOrders: 3n }])
        .mockResolvedValueOnce([
          {
            concertId: 'concert-1',
            title: 'Top Show',
            organizerId: 'organizer-1',
            organizerDisplayName: 'Organizer One',
            revenueVnd: '500000',
            paidOrders: '5',
          },
        ]),
    });

    const result = await new GetAdminDashboardMetricsUseCase(prisma).execute({ windowDays: 3 });

    expect(prisma.order.aggregate).toHaveBeenCalledWith({
      where: { status: OrderStatus.PAID },
      _sum: { totalAmountVnd: true },
    });
    expect(prisma.concert.count).toHaveBeenCalledWith({
      where: { status: ConcertStatus.PUBLISHED },
    });
    expect(result).toEqual({
      totalPlatformRevenueVnd: 900000,
      totalActiveConcerts: 4,
      revenueTrend: {
        windowDays: 3,
        points: [
          { date: '2026-06-23', revenueVnd: 0, paidOrders: 0 },
          { date: '2026-06-24', revenueVnd: 300000, paidOrders: 3 },
          { date: '2026-06-25', revenueVnd: 0, paidOrders: 0 },
        ],
      },
      topGrossingConcerts: [
        {
          concertId: 'concert-1',
          title: 'Top Show',
          organizerId: 'organizer-1',
          organizerDisplayName: 'Organizer One',
          revenueVnd: 500000,
          paidOrders: 5,
        },
      ],
    });
  });
});

describe('GetOrganizerDashboardMetricsUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('scopes revenue, trend, and check-in metrics to the authenticated organizer', async () => {
    const queryRaw = vi
      .fn()
      .mockResolvedValueOnce([{ date: '2026-06-25', revenueVnd: '250000', paidOrders: '2' }])
      .mockResolvedValueOnce([{ scopedConcerts: 2n, eligibleTickets: 10n, checkedInTickets: 7n }]);
    const prisma = prismaWith({
      order: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { totalAmountVnd: 700000 } }),
      },
      $queryRaw: queryRaw,
    });

    const result = await new GetOrganizerDashboardMetricsUseCase(prisma).execute({
      organizerId: 'organizer-1',
      windowDays: 2,
    });

    expect(prisma.order.aggregate).toHaveBeenCalledWith({
      where: {
        status: OrderStatus.PAID,
        concert: { createdById: 'organizer-1' },
      },
      _sum: { totalAmountVnd: true },
    });
    expect(queryRaw.mock.calls[0]).toContain('organizer-1');
    expect(queryRaw.mock.calls[1]).toContain('organizer-1');
    expect(result).toEqual({
      myTotalRevenueVnd: 700000,
      ticketSalesVelocity: {
        windowDays: 2,
        points: [
          { date: '2026-06-24', revenueVnd: 0, paidOrders: 0 },
          { date: '2026-06-25', revenueVnd: 250000, paidOrders: 2 },
        ],
      },
      overallCheckinRate: {
        scopedConcerts: 2,
        eligibleTickets: 10,
        checkedInTickets: 7,
        rate: 0.7,
      },
    });
  });

  it('returns a zero check-in rate when there are no eligible tickets', async () => {
    const prisma = prismaWith({
      order: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { totalAmountVnd: null } }),
      },
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ scopedConcerts: 1n, eligibleTickets: 0n, checkedInTickets: 0n }]),
    });

    const result = await new GetOrganizerDashboardMetricsUseCase(prisma).execute({
      organizerId: 'organizer-1',
      windowDays: 1,
    });

    expect(result.myTotalRevenueVnd).toBe(0);
    expect(result.overallCheckinRate).toEqual({
      scopedConcerts: 1,
      eligibleTickets: 0,
      checkedInTickets: 0,
      rate: 0,
    });
  });
});
