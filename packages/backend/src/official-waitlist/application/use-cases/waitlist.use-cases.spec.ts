import { describe, expect, it, vi } from 'vitest';

import {
  ExpireWaitlistEntitlementsUseCase,
  GetWaitlistStatusUseCase,
  GrantWaitlistEntitlementsUseCase,
  JoinWaitlistUseCase,
  LeaveWaitlistUseCase,
  SendWaitlistEntitlementRemindersUseCase,
} from './waitlist.use-cases';
import {
  WaitlistQuantityExceededError,
  WaitlistTicketTypeNotEligibleError,
} from '../../domain/errors';
import type { OfficialWaitlistRepositoryPort } from '../../domain/ports/official-waitlist-repository.port';
import type {
  PurchaseEntitlementRecord,
  TicketTypeWaitlistInfo,
  WaitlistEntryRecord,
} from '../../domain/waitlist.types';

function makeEntry(overrides: Partial<WaitlistEntryRecord> = {}): WaitlistEntryRecord {
  return {
    id: 'entry-1',
    userId: 'user-1',
    concertId: 'concert-1',
    ticketTypeId: 'ticket-type-1',
    desiredQuantity: 1,
    status: 'WAITING',
    joinedAt: new Date('2026-07-07T01:00:00.000Z'),
    grantedAt: null,
    fulfilledAt: null,
    cancelledAt: null,
    expiredAt: null,
    ...overrides,
  };
}

function makeEntitlement(
  overrides: Partial<PurchaseEntitlementRecord> = {},
): PurchaseEntitlementRecord {
  return {
    id: 'entitlement-1',
    waitlistEntryId: 'entry-1',
    userId: 'user-1',
    concertId: 'concert-1',
    ticketTypeId: 'ticket-type-1',
    orderId: null,
    source: 'WAITLIST',
    status: 'ACTIVE',
    quantity: 1,
    grantedAt: new Date('2026-07-07T01:05:00.000Z'),
    expiresAt: new Date('2026-07-07T01:20:00.000Z'),
    consumedAt: null,
    revokedAt: null,
    ...overrides,
  };
}

function makeTicketType(
  overrides: Partial<TicketTypeWaitlistInfo> = {},
): TicketTypeWaitlistInfo {
  return {
    id: 'ticket-type-1',
    concertId: 'concert-1',
    totalQuantity: 10,
    reservedQuantity: 10,
    soldQuantity: 0,
    maxPerUser: 4,
    status: 'ACTIVE',
    saleStartsAt: new Date('2026-07-01T00:00:00.000Z'),
    saleEndsAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeRepository(
  overrides: Partial<OfficialWaitlistRepositoryPort> = {},
): OfficialWaitlistRepositoryPort {
  return {
    findTicketType: vi.fn().mockResolvedValue(makeTicketType()),
    countAlreadyReservedOrSoldByUser: vi.fn().mockResolvedValue(0),
    findActiveEntry: vi.fn().mockResolvedValue(null),
    createEntry: vi.fn().mockResolvedValue(makeEntry()),
    cancelEntryAndRevokeEntitlement: vi.fn().mockResolvedValue({
      entry: makeEntry({ status: 'CANCELLED', cancelledAt: new Date() }),
      revokedEntitlementId: null,
    }),
    getStatus: vi.fn().mockResolvedValue({
      entry: makeEntry(),
      queuePosition: 1,
      entitlement: null,
    }),
    hasActiveGate: vi.fn().mockResolvedValue(false),
    sumActiveEntitlementQuantity: vi.fn().mockResolvedValue(0),
    listNextWaitingEntries: vi.fn().mockResolvedValue([makeEntry()]),
    grantEntitlement: vi.fn().mockResolvedValue(makeEntitlement()),
    findEntitlementNotificationContext: vi.fn().mockResolvedValue(null),
    listActiveEntitlementsExpiringSoon: vi.fn().mockResolvedValue([]),
    expireEntitlements: vi.fn().mockResolvedValue([]),
    withTicketTypeLock: vi.fn((_, work) => work()),
    ...overrides,
  };
}

describe('official waitlist use cases', () => {
  it('joins a sold-out primary ticket type and returns queue status', async () => {
    const repository = makeRepository();
    const useCase = new JoinWaitlistUseCase(repository);

    const result = await useCase.execute({
      userId: 'user-1',
      concertId: 'concert-1',
      ticketTypeId: 'ticket-type-1',
      desiredQuantity: 2,
    });

    expect(repository.createEntry).toHaveBeenCalledWith(
      expect.objectContaining({ desiredQuantity: 2 }),
    );
    expect(result.queuePosition).toBe(1);
  });

  it('returns existing status instead of creating a duplicate active entry', async () => {
    const repository = makeRepository({
      findActiveEntry: vi.fn().mockResolvedValue(makeEntry()),
    });
    const useCase = new JoinWaitlistUseCase(repository);

    await useCase.execute({
      userId: 'user-1',
      concertId: 'concert-1',
      ticketTypeId: 'ticket-type-1',
      desiredQuantity: 1,
    });

    expect(repository.createEntry).not.toHaveBeenCalled();
    expect(repository.getStatus).toHaveBeenCalled();
  });

  it('rejects joining when normal checkout is still available and not gated', async () => {
    const repository = makeRepository({
      findTicketType: vi.fn().mockResolvedValue(
        makeTicketType({ totalQuantity: 10, reservedQuantity: 0, soldQuantity: 0 }),
      ),
    });
    const useCase = new JoinWaitlistUseCase(repository);

    await expect(
      useCase.execute({
        userId: 'user-1',
        concertId: 'concert-1',
        ticketTypeId: 'ticket-type-1',
        desiredQuantity: 1,
      }),
    ).rejects.toBeInstanceOf(WaitlistTicketTypeNotEligibleError);
  });

  it('caps desired quantity by remaining per-user allowance', async () => {
    const repository = makeRepository({
      countAlreadyReservedOrSoldByUser: vi.fn().mockResolvedValue(4),
    });
    const useCase = new JoinWaitlistUseCase(repository);

    await expect(
      useCase.execute({
        userId: 'user-1',
        concertId: 'concert-1',
        ticketTypeId: 'ticket-type-1',
        desiredQuantity: 1,
      }),
    ).rejects.toBeInstanceOf(WaitlistQuantityExceededError);
  });

  it('leaves waitlist and revokes active entitlement when present', async () => {
    const repository = makeRepository({
      cancelEntryAndRevokeEntitlement: vi.fn().mockResolvedValue({
        entry: makeEntry({ status: 'CANCELLED' }),
        revokedEntitlementId: 'entitlement-1',
      }),
    });
    const result = await new LeaveWaitlistUseCase(repository).execute({
      userId: 'user-1',
      ticketTypeId: 'ticket-type-1',
    });

    expect(result.revokedEntitlementId).toBe('entitlement-1');
  });

  it('reads waitlist status with queue position and entitlement details', async () => {
    const repository = makeRepository({
      getStatus: vi.fn().mockResolvedValue({
        entry: makeEntry({ status: 'GRANTED' }),
        queuePosition: null,
        entitlement: makeEntitlement(),
      }),
    });

    const result = await new GetWaitlistStatusUseCase(repository).execute({
      userId: 'user-1',
      concertId: 'concert-1',
      ticketTypeId: 'ticket-type-1',
    });

    expect(result.entitlement?.id).toBe('entitlement-1');
  });

  it('grants FIFO entitlements without mutating inventory quantities', async () => {
    const repository = makeRepository({
      findTicketType: vi.fn().mockResolvedValue(
        makeTicketType({ totalQuantity: 10, reservedQuantity: 9, soldQuantity: 0 }),
      ),
      listNextWaitingEntries: vi.fn().mockResolvedValue([
        makeEntry({ id: 'entry-1', joinedAt: new Date('2026-07-07T01:00:00.000Z') }),
      ]),
    });
    const notifier = {
      notifyEntitlementGranted: vi.fn(),
      notifyEntitlementExpiringSoon: vi.fn(),
    };
    const useCase = new GrantWaitlistEntitlementsUseCase(repository, notifier, 15);

    const result = await useCase.execute({
      ticketTypeId: 'ticket-type-1',
      releasedQuantity: 1,
      now: new Date('2026-07-07T01:05:00.000Z'),
    });

    expect(result).toHaveLength(1);
    expect(repository.grantEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({ entryId: 'entry-1', quantity: 1 }),
    );
  });

  it('keeps granted entitlement when notification fails', async () => {
    const repository = makeRepository({
      findTicketType: vi.fn().mockResolvedValue(
        makeTicketType({ totalQuantity: 10, reservedQuantity: 9, soldQuantity: 0 }),
      ),
    });
    const notifier = {
      notifyEntitlementGranted: vi.fn().mockRejectedValue(new Error('mail down')),
      notifyEntitlementExpiringSoon: vi.fn(),
    };
    const useCase = new GrantWaitlistEntitlementsUseCase(repository, notifier, 15);

    await expect(
      useCase.execute({ ticketTypeId: 'ticket-type-1', releasedQuantity: 1 }),
    ).resolves.toHaveLength(1);
  });

  it('expires unused entitlements and triggers the next grant opportunity', async () => {
    const repository = makeRepository({
      expireEntitlements: vi.fn().mockResolvedValue([
        { ticketTypeId: 'ticket-type-1', quantity: 1 },
      ]),
    });
    const grantUseCase = {
      execute: vi.fn().mockResolvedValue([]),
    } as unknown as GrantWaitlistEntitlementsUseCase;

    const result = await new ExpireWaitlistEntitlementsUseCase(
      repository,
      grantUseCase,
    ).execute();

    expect(result).toEqual({ expired: 1, grantsTriggered: 1 });
    expect(grantUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ ticketTypeId: 'ticket-type-1', releasedQuantity: 1 }),
    );
  });

  it('enqueues one-time reminders for active entitlements approaching expiry', async () => {
    const entitlement = makeEntitlement({
      expiresAt: new Date('2026-07-07T01:09:00.000Z'),
    });
    const repository = makeRepository({
      listActiveEntitlementsExpiringSoon: vi.fn().mockResolvedValue([entitlement]),
    });
    const notifier = {
      notifyEntitlementGranted: vi.fn(),
      notifyEntitlementExpiringSoon: vi.fn(),
    };

    const result = await new SendWaitlistEntitlementRemindersUseCase(
      repository,
      notifier,
      5,
    ).execute({ now: new Date('2026-07-07T01:05:00.000Z') });

    expect(result).toEqual({ enqueued: 1 });
    expect(repository.listActiveEntitlementsExpiringSoon).toHaveBeenCalledWith({
      now: new Date('2026-07-07T01:05:00.000Z'),
      reminderWindowEndsAt: new Date('2026-07-07T01:10:00.000Z'),
      limit: 100,
    });
    expect(notifier.notifyEntitlementExpiringSoon).toHaveBeenCalledWith(entitlement);
  });
});
