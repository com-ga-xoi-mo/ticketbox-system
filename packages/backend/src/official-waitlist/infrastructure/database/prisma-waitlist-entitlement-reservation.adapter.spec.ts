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
});
