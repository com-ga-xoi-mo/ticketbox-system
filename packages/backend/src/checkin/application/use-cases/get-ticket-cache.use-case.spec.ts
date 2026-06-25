import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Role } from '../../../identity/domain/role.enum';
import type { CheckinStaffAssignmentRepositoryPort } from '../../../identity/domain/ports/checkin-staff-assignment.port';
import type { TicketCacheQueryPort } from '../../domain/ports/ticket-cache-query.port';
import { GetTicketCacheUseCase } from './get-ticket-cache.use-case';

const actor = { userId: 'staff-1', roles: [Role.CHECKIN_STAFF] };
const assignmentId = 'assignment-1';
const concertId = 'concert-1';
const hash = 'a'.repeat(64);

const activeAssignment = {
  id: assignmentId,
  staffUserId: actor.userId,
  concertId,
  status: 'ACTIVE' as const,
  assignedAt: new Date(),
};

describe('GetTicketCacheUseCase', () => {
  let cacheQuery: TicketCacheQueryPort;
  let assignments: Pick<CheckinStaffAssignmentRepositoryPort, 'findAssignmentById'>;
  let useCase: GetTicketCacheUseCase;

  beforeEach(() => {
    cacheQuery = {
      getFullCache: vi.fn().mockResolvedValue([{ hash, status: 'valid' }]),
      getDeltaCache: vi.fn().mockResolvedValue({
        upserted: [{ hash, status: 'checked_in' }],
        voided: [],
      }),
    };
    assignments = { findAssignmentById: vi.fn().mockResolvedValue(activeAssignment) };
    useCase = new GetTicketCacheUseCase(
      cacheQuery,
      assignments as CheckinStaffAssignmentRepositoryPort,
    );
  });

  it('returns full cache when no since provided', async () => {
    const result = await useCase.execute({ actor, assignmentId, concertId });
    expect(result.kind).toBe('full');
    if (result.kind !== 'full') return;
    expect(result.entries).toEqual([{ hash, status: 'valid' }]);
  });

  it('returns delta cache when since is provided', async () => {
    const since = new Date('2026-01-01T00:00:00Z');
    const result = await useCase.execute({ actor, assignmentId, concertId, since });
    expect(result.kind).toBe('delta');
    if (result.kind !== 'delta') return;
    expect(result.upserted).toEqual([{ hash, status: 'checked_in' }]);
    expect(cacheQuery.getDeltaCache).toHaveBeenCalledWith(concertId, since);
  });

  it('returns forbidden when assignment not found', async () => {
    vi.mocked(assignments.findAssignmentById).mockResolvedValue(null);
    const result = await useCase.execute({ actor, assignmentId, concertId });
    expect(result.kind).toBe('forbidden');
  });

  it('returns forbidden when assignment belongs to different staff', async () => {
    vi.mocked(assignments.findAssignmentById).mockResolvedValue({
      ...activeAssignment,
      staffUserId: 'other-staff',
    });
    const result = await useCase.execute({ actor, assignmentId, concertId });
    expect(result.kind).toBe('forbidden');
  });

  it('returns forbidden when assignment is revoked', async () => {
    vi.mocked(assignments.findAssignmentById).mockResolvedValue({
      ...activeAssignment,
      status: 'REVOKED',
    });
    const result = await useCase.execute({ actor, assignmentId, concertId });
    expect(result.kind).toBe('forbidden');
  });

  it('returns bad-request when concert does not match assignment', async () => {
    const result = await useCase.execute({ actor, assignmentId, concertId: 'wrong-concert' });
    expect(result.kind).toBe('bad-request');
  });
});
