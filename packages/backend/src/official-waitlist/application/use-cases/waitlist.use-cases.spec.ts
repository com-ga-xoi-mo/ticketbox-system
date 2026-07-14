import { describe, expect, it, vi } from 'vitest';

import {
  WaitlistQuantityExceededError,
  WaitlistTicketTypeNotEligibleError,
} from '../../domain/errors';
import type { OfficialWaitlistRepositoryPort } from '../../domain/ports/official-waitlist-repository.port';
import type {
  TicketTypeWaitlistInfo,
  WaitlistEntryRecord,
  WaitlistRecoveryNotificationContext,
} from '../../domain/waitlist.types';
import {
  GetWaitlistStatusUseCase,
  JoinWaitlistUseCase,
  LeaveWaitlistUseCase,
  WatchWaitlistAvailabilityUseCase,
} from './waitlist.use-cases';

function makeEntry(overrides: Partial<WaitlistEntryRecord> = {}): WaitlistEntryRecord {
  return {
    id: 'entry-1',
    userId: 'user-1',
    concertId: 'concert-1',
    ticketTypeId: 'ticket-type-1',
    desiredQuantity: 1,
    status: 'WAITING',
    joinedAt: new Date('2026-07-07T01:00:00.000Z'),
    cancelledAt: null,
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

function makeContext(
  overrides: Partial<WaitlistRecoveryNotificationContext> = {},
): WaitlistRecoveryNotificationContext {
  return {
    entry: makeEntry(),
    userEmail: 'audience@ticketbox.test',
    userDisplayName: 'Nguyễn Linh',
    concertTitle: 'Anh Trai Say Hi Live Concert',
    concertSlug: 'anh-trai-say-hi-2026',
    ticketTypeName: 'SVIP',
    ticketTypeCode: 'SVIP',
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
    cancelEntry: vi.fn().mockResolvedValue(makeEntry({ status: 'CANCELLED' })),
    getStatus: vi.fn().mockResolvedValue({ entry: makeEntry() }),
    listTicketTypesWithActiveSubscribers: vi.fn().mockResolvedValue(['ticket-type-1']),
    getOrCreateAvailabilityMarker: vi.fn().mockResolvedValue({
      ticketTypeId: 'ticket-type-1',
      markerState: 'SOLD_OUT',
      lastNotifiedAt: null,
    }),
    updateAvailabilityMarker: vi.fn().mockResolvedValue(undefined),
    listActiveSubscriberNotificationContexts: vi
      .fn()
      .mockResolvedValue([makeContext(), makeContext({ entry: makeEntry({ id: 'entry-2' }) })]),
    withTicketTypeLock: vi.fn((_, work) => work()),
    ...overrides,
  };
}

describe('official waitlist use cases', () => {
  it('joins a sold-out primary ticket type and returns subscribed status', async () => {
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
    expect(result.entry?.status).toBe('WAITING');
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

  it('rejects joining when public availability is greater than zero', async () => {
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

  it('leaves waitlist by cancelling the active subscription', async () => {
    const repository = makeRepository();

    const result = await new LeaveWaitlistUseCase(repository).execute({
      userId: 'user-1',
      ticketTypeId: 'ticket-type-1',
    });

    expect(repository.cancelEntry).toHaveBeenCalled();
    expect(result.entry?.status).toBe('CANCELLED');
  });

  it('reads waitlist status without entitlement details', async () => {
    const repository = makeRepository();

    const result = await new GetWaitlistStatusUseCase(repository).execute({
      userId: 'user-1',
      concertId: 'concert-1',
      ticketTypeId: 'ticket-type-1',
    });

    expect(result).toEqual({ entry: makeEntry() });
  });

  it('notifies all subscribers once when sold-out ticket type recovers', async () => {
    const now = new Date('2026-07-07T01:05:00.000Z');
    const repository = makeRepository({
      findTicketType: vi.fn().mockResolvedValue(
        makeTicketType({ totalQuantity: 10, reservedQuantity: 9, soldQuantity: 0 }),
      ),
    });
    const notifier = { notifyAvailabilityRecovered: vi.fn() };

    const result = await new WatchWaitlistAvailabilityUseCase(
      repository,
      notifier,
    ).execute({ now });

    expect(result).toEqual({ scanned: 1, notifiedTicketTypes: 1, notifications: 2 });
    expect(notifier.notifyAvailabilityRecovered).toHaveBeenCalledTimes(2);
    expect(repository.updateAvailabilityMarker).toHaveBeenCalledWith({
      ticketTypeId: 'ticket-type-1',
      markerState: 'NOTIFIED',
      lastNotifiedAt: now,
    });
  });

  it('re-arms the marker when availability returns to zero', async () => {
    const repository = makeRepository({
      getOrCreateAvailabilityMarker: vi.fn().mockResolvedValue({
        ticketTypeId: 'ticket-type-1',
        markerState: 'NOTIFIED',
        lastNotifiedAt: new Date('2026-07-07T01:05:00.000Z'),
      }),
      findTicketType: vi.fn().mockResolvedValue(
        makeTicketType({ totalQuantity: 10, reservedQuantity: 10, soldQuantity: 0 }),
      ),
    });
    const notifier = { notifyAvailabilityRecovered: vi.fn() };

    const result = await new WatchWaitlistAvailabilityUseCase(
      repository,
      notifier,
    ).execute();

    expect(result).toEqual({ scanned: 1, notifiedTicketTypes: 0, notifications: 0 });
    expect(notifier.notifyAvailabilityRecovered).not.toHaveBeenCalled();
    expect(repository.updateAvailabilityMarker).toHaveBeenCalledWith({
      ticketTypeId: 'ticket-type-1',
      markerState: 'SOLD_OUT',
    });
  });
});
