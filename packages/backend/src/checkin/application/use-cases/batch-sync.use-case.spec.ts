import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Role } from '../../../identity/domain/role.enum';
import type { CheckinTicketRepositoryPort } from '../../domain/ports/checkin-ticket-repository.port';
import type { TicketCacheQueryPort } from '../../domain/ports/ticket-cache-query.port';
import type { ScanValidationService } from '../services/scan-validation.service';
import { BatchSyncUseCase } from './batch-sync.use-case';

const scannedAt = new Date('2026-06-21T08:00:00.000Z');
const actor = { userId: 'staff-1', roles: [Role.CHECKIN_STAFF] };
const event = {
  localId: 'local-1',
  assignmentId: 'assignment-1',
  concertId: 'concert-1',
  gateName: 'Main Gate',
  qrPayloadHash: 'a'.repeat(64),
  scannedAt,
  deviceId: 'device-1',
};
const ticket = {
  id: 'ticket-1',
  concertId: 'concert-1',
  status: 'ISSUED' as const,
  qrTokenHash: event.qrPayloadHash,
};

describe('BatchSyncUseCase', () => {
  let repository: CheckinTicketRepositoryPort;
  let validation: Pick<ScanValidationService, 'validate'>;
  let cacheQuery: TicketCacheQueryPort;
  let useCase: BatchSyncUseCase;

  beforeEach(() => {
    repository = {
      findByQrTokenHash: vi.fn(),
      hasAcceptedCheckin: vi.fn(),
      recordAcceptedScan: vi.fn(),
      recordRejectedScan: vi.fn(),
      findOfflineEvent: vi.fn(),
      recordOfflineOutcome: vi.fn(),
    };
    validation = { validate: vi.fn() };
    cacheQuery = {
      getFullCache: vi.fn().mockResolvedValue([]),
      getDeltaCache: vi.fn().mockResolvedValue({ upserted: [], voided: [] }),
    };
    vi.mocked(repository.findOfflineEvent).mockResolvedValue(null);
    vi.mocked(validation.validate).mockResolvedValue({ status: 'valid', ticket });
    useCase = new BatchSyncUseCase(repository, validation as ScanValidationService, cacheQuery);
  });

  it('isolates mixed accepted and invalid business outcomes', async () => {
    vi.mocked(validation.validate)
      .mockResolvedValueOnce({ status: 'valid', ticket })
      .mockResolvedValueOnce({
        status: 'invalid',
        reasonCode: 'INVALID_TICKET',
        message: 'Invalid',
      });
    vi.mocked(repository.recordAcceptedScan).mockResolvedValue({
      status: 'accepted',
      ticketId: ticket.id,
      checkedInAt: scannedAt,
    });

    const result = await useCase.execute({
      actor,
      events: [event, { ...event, localId: 'local-2', qrPayloadHash: 'b'.repeat(64) }],
    });

    expect(result.events.map(({ status }) => status)).toEqual(['accepted', 'invalid']);
    expect(repository.recordOfflineOutcome).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['same device', 'device-1', 'duplicate'],
    ['another device', 'device-2', 'conflict'],
  ] as const)('classifies claim loss from %s as %s', async (_name, acceptedByDeviceId, status) => {
    vi.mocked(repository.recordAcceptedScan).mockResolvedValue({
      status: 'duplicate',
      ticketId: ticket.id,
      acceptedByDeviceId,
    });
    const result = await useCase.execute({ actor, events: [event] });
    expect(result.events[0].status).toBe(status);
    expect(repository.recordOfflineOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ result: status === 'duplicate' ? 'DUPLICATE' : 'CONFLICT' }),
    );
  });

  it('returns an exact replay only to the owning actor', async () => {
    vi.mocked(repository.findOfflineEvent).mockResolvedValue({
      staffId: actor.userId,
      ticketId: ticket.id,
      result: 'ACCEPTED',
      checkedInAt: scannedAt,
    });
    await expect(useCase.execute({ actor, events: [event] })).resolves.toMatchObject({
      events: [{ status: 'accepted', ticketId: ticket.id }],
    });
    expect(validation.validate).not.toHaveBeenCalled();
  });

  it('rejects cross-actor replay without disclosing stored outcome metadata', async () => {
    vi.mocked(repository.findOfflineEvent).mockResolvedValue({
      staffId: 'staff-2',
      ticketId: 'secret-ticket',
      result: 'ACCEPTED',
      checkedInAt: scannedAt,
    });
    const result = await useCase.execute({ actor, events: [event] });
    expect(result.events[0]).toEqual(
      expect.objectContaining({ status: 'unassigned', reasonCode: 'ASSIGNMENT_MISMATCH' }),
    );
    expect(JSON.stringify(result)).not.toContain('secret-ticket');
  });

  it('uses server claim order rather than device timestamps', async () => {
    vi.mocked(repository.recordAcceptedScan).mockResolvedValue({
      status: 'accepted',
      ticketId: ticket.id,
      checkedInAt: new Date('2026-06-21T09:00:00.000Z'),
    });
    await useCase.execute({ actor, events: [{ ...event, scannedAt: new Date('2020-01-01') }] });
    expect(repository.recordAcceptedScan).toHaveBeenCalledWith(
      expect.objectContaining({ occurredAt: new Date('2020-01-01') }),
    );
  });

  it('propagates unexpected infrastructure errors', async () => {
    vi.mocked(repository.recordAcceptedScan).mockRejectedValue(new Error('database unavailable'));
    await expect(useCase.execute({ actor, events: [event] })).rejects.toThrow('database unavailable');
  });

  it('omits cacheUpdates when since is not provided', async () => {
    vi.mocked(repository.recordAcceptedScan).mockResolvedValue({
      status: 'accepted',
      ticketId: ticket.id,
      checkedInAt: scannedAt,
    });
    const result = await useCase.execute({ actor, events: [event] });
    expect(result.cacheUpdates).toBeUndefined();
    expect(cacheQuery.getDeltaCache).not.toHaveBeenCalled();
  });

  it('computes cacheUpdates after events when since is provided', async () => {
    vi.mocked(repository.recordAcceptedScan).mockResolvedValue({
      status: 'accepted',
      ticketId: ticket.id,
      checkedInAt: scannedAt,
    });
    const since = new Date('2026-01-01T00:00:00Z');
    vi.mocked(cacheQuery.getDeltaCache).mockResolvedValue({
      upserted: [{ hash: 'a'.repeat(64), status: 'checked_in' }],
      voided: [],
    });
    const result = await useCase.execute({ actor, events: [event], since });
    expect(result.cacheUpdates?.upserted).toHaveLength(1);
    expect(cacheQuery.getDeltaCache).toHaveBeenCalledWith(event.concertId, since);
  });
});
