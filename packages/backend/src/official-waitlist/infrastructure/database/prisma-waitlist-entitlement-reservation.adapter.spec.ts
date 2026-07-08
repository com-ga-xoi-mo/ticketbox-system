import { describe, expect, it, vi } from 'vitest';

import {
  WaitlistEntitlementExpiredError,
  WaitlistEntitlementQuantityExceededError,
  WaitlistEntitlementRequiredError,
} from '../../../ordering/domain/errors';
import { PrismaWaitlistEntitlementReservationAdapter } from './prisma-waitlist-entitlement-reservation.adapter';

function makeTx(overrides: Partial<any> = {}) {
  return {
    waitlistEntry: {
      count: vi.fn().mockResolvedValue(1),
      update: vi.fn().mockResolvedValue({}),
    },
    purchaseEntitlement: {
      count: vi.fn().mockResolvedValue(1),
      update: vi.fn().mockResolvedValue({}),
    },
    lotteryRegistration: {
      update: vi.fn().mockResolvedValue({}),
    },
    ticketType: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ presaleGateOpensAt: null, presaleGateClosesAt: null }),
    },
    $queryRawUnsafe: vi.fn().mockResolvedValue([
      {
        id: 'entitlement-1',
        userId: 'user-1',
        concertId: 'concert-1',
        ticketTypeId: 'ticket-type-1',
        status: 'ACTIVE',
        quantity: 2,
        expiresAt: new Date('2026-07-07T02:00:00.000Z'),
        waitlistEntryId: 'entry-1',
        lotteryRegistrationId: null,
      },
    ]),
    ...overrides,
  };
}

const request = {
  entitlementId: 'entitlement-1',
  userId: 'user-1',
  concertId: 'concert-1',
  orderId: 'order-1',
  now: new Date('2026-07-07T01:00:00.000Z'),
  items: [{ ticketTypeId: 'ticket-type-1', quantity: 2 }],
};

describe('PrismaWaitlistEntitlementReservationAdapter', () => {
  it('does nothing for non-gated direct checkout', async () => {
    const tx = makeTx({
      waitlistEntry: { count: vi.fn().mockResolvedValue(0), update: vi.fn() },
      purchaseEntitlement: { count: vi.fn().mockResolvedValue(0), update: vi.fn() },
    });

    await new PrismaWaitlistEntitlementReservationAdapter()
      .validateAndConsumeForReservation(tx, { ...request, entitlementId: undefined });

    expect(tx.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(tx.purchaseEntitlement.update).not.toHaveBeenCalled();
  });

  it('requires an entitlement for gated ticket types', async () => {
    await expect(
      new PrismaWaitlistEntitlementReservationAdapter()
        .validateAndConsumeForReservation(makeTx(), {
          ...request,
          entitlementId: undefined,
        }),
    ).rejects.toBeInstanceOf(WaitlistEntitlementRequiredError);
  });

  it('rejects expired entitlements before consuming them', async () => {
    const tx = makeTx({
      $queryRawUnsafe: vi.fn().mockResolvedValue([
        {
          id: 'entitlement-1',
          userId: 'user-1',
          concertId: 'concert-1',
          ticketTypeId: 'ticket-type-1',
          status: 'ACTIVE',
          quantity: 2,
          expiresAt: new Date('2026-07-07T00:59:00.000Z'),
          waitlistEntryId: 'entry-1',
        },
      ]),
    });

    await expect(
      new PrismaWaitlistEntitlementReservationAdapter()
        .validateAndConsumeForReservation(tx, request),
    ).rejects.toBeInstanceOf(WaitlistEntitlementExpiredError);
    expect(tx.purchaseEntitlement.update).not.toHaveBeenCalled();
  });

  it('rejects quantity above entitlement before consuming it', async () => {
    await expect(
      new PrismaWaitlistEntitlementReservationAdapter()
        .validateAndConsumeForReservation(makeTx(), {
          ...request,
          items: [{ ticketTypeId: 'ticket-type-1', quantity: 3 }],
        }),
    ).rejects.toBeInstanceOf(WaitlistEntitlementQuantityExceededError);
  });

  it('consumes a valid entitlement and marks the waitlist entry fulfilled', async () => {
    const tx = makeTx();

    await new PrismaWaitlistEntitlementReservationAdapter()
      .validateAndConsumeForReservation(tx, request);

    expect(tx.purchaseEntitlement.update).toHaveBeenCalledWith({
      where: { id: 'entitlement-1' },
      data: {
        status: 'CONSUMED',
        consumedAt: request.now,
        orderId: 'order-1',
      },
    });
    expect(tx.waitlistEntry.update).toHaveBeenCalledWith({
      where: { id: 'entry-1' },
      data: {
        status: 'FULFILLED',
        fulfilledAt: request.now,
      },
    });
  });

  it('gates a ticket type inside its presale lottery window even with no entries or entitlements', async () => {
    const tx = makeTx({
      waitlistEntry: { count: vi.fn().mockResolvedValue(0), update: vi.fn() },
      purchaseEntitlement: { count: vi.fn().mockResolvedValue(0), update: vi.fn() },
      ticketType: {
        findUnique: vi.fn().mockResolvedValue({
          presaleGateOpensAt: new Date('2026-07-07T00:00:00.000Z'),
          presaleGateClosesAt: new Date('2026-07-07T05:00:00.000Z'),
        }),
      },
    });

    await expect(
      new PrismaWaitlistEntitlementReservationAdapter().validateAndConsumeForReservation(tx, {
        ...request,
        entitlementId: undefined,
      }),
    ).rejects.toBeInstanceOf(WaitlistEntitlementRequiredError);
  });

  it('keeps non-winners blocked after an early manual draw while the presale window remains open', async () => {
    const tx = makeTx({
      waitlistEntry: { count: vi.fn().mockResolvedValue(0), update: vi.fn() },
      purchaseEntitlement: {
        count: vi.fn().mockImplementation(({ where }) =>
          Promise.resolve(where.source === 'WAITLIST' ? 0 : 1),
        ),
        update: vi.fn().mockResolvedValue({}),
      },
      ticketType: {
        findUnique: vi.fn().mockResolvedValue({
          presaleGateOpensAt: new Date('2026-07-07T00:00:00.000Z'),
          presaleGateClosesAt: new Date('2026-07-07T05:00:00.000Z'),
        }),
      },
    });

    await expect(
      new PrismaWaitlistEntitlementReservationAdapter().validateAndConsumeForReservation(tx, {
        ...request,
        entitlementId: undefined,
      }),
    ).rejects.toBeInstanceOf(WaitlistEntitlementRequiredError);
    expect(tx.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('allows direct checkout after public sale starts even if LOTTERY entitlements remain active', async () => {
    const waitlistEntitlementCount = vi.fn().mockResolvedValue(0);
    const tx = makeTx({
      waitlistEntry: { count: vi.fn().mockResolvedValue(0), update: vi.fn() },
      purchaseEntitlement: {
        count: waitlistEntitlementCount,
        update: vi.fn().mockResolvedValue({}),
      },
      ticketType: {
        findUnique: vi.fn().mockResolvedValue({
          presaleGateOpensAt: new Date('2026-07-07T00:00:00.000Z'),
          presaleGateClosesAt: new Date('2026-07-07T05:00:00.000Z'),
        }),
      },
    });

    await new PrismaWaitlistEntitlementReservationAdapter().validateAndConsumeForReservation(
      tx,
      {
        ...request,
        now: new Date('2026-07-07T05:00:00.000Z'),
        entitlementId: undefined,
      },
    );

    expect(waitlistEntitlementCount).toHaveBeenCalledWith({
      where: {
        ticketTypeId: 'ticket-type-1',
        source: 'WAITLIST',
        status: 'ACTIVE',
        expiresAt: { gt: new Date('2026-07-07T05:00:00.000Z') },
      },
    });
    expect(tx.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(tx.purchaseEntitlement.update).not.toHaveBeenCalled();
  });

  it('consumes a LOTTERY entitlement and marks the lottery registration fulfilled', async () => {
    const tx = makeTx({
      waitlistEntry: { count: vi.fn().mockResolvedValue(0), update: vi.fn() },
      purchaseEntitlement: {
        count: vi.fn().mockResolvedValue(0),
        update: vi.fn().mockResolvedValue({}),
      },
      ticketType: {
        findUnique: vi.fn().mockResolvedValue({
          presaleGateOpensAt: new Date('2026-07-07T00:00:00.000Z'),
          presaleGateClosesAt: new Date('2026-07-07T05:00:00.000Z'),
        }),
      },
      $queryRawUnsafe: vi.fn().mockResolvedValue([
        {
          id: 'entitlement-1',
          userId: 'user-1',
          concertId: 'concert-1',
          ticketTypeId: 'ticket-type-1',
          status: 'ACTIVE',
          quantity: 2,
          expiresAt: new Date('2026-07-07T02:00:00.000Z'),
          waitlistEntryId: null,
          lotteryRegistrationId: 'reg-1',
        },
      ]),
    });

    await new PrismaWaitlistEntitlementReservationAdapter().validateAndConsumeForReservation(
      tx,
      request,
    );

    expect(tx.purchaseEntitlement.update).toHaveBeenCalledWith({
      where: { id: 'entitlement-1' },
      data: { status: 'CONSUMED', consumedAt: request.now, orderId: 'order-1' },
    });
    expect(tx.waitlistEntry.update).not.toHaveBeenCalled();
    expect(tx.lotteryRegistration.update).toHaveBeenCalledWith({
      where: { id: 'reg-1' },
      data: { fulfilledAt: request.now },
    });
  });
});
