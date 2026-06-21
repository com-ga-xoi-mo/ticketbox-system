import { GuestListEntryStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { Role } from '../../../identity/domain/role.enum';
import { LookupVipGuestUseCase } from './lookup-vip-guest.use-case';

const actor = { id: 'staff', email: 'staff@x.test', roles: [Role.CHECKIN_STAFF] };
const assignment = {
  id: 'assignment',
  staffUserId: 'staff',
  concertId: 'concert',
  gateName: 'VIP',
  status: 'ACTIVE' as const,
  assignedAt: new Date(),
};
describe('LookupVipGuestUseCase', () => {
  it('normalizes and returns only an active guest for the exact selected assignment', async () => {
    const repository = {
      findActiveGuest: vi.fn().mockResolvedValue({
        id: 'guest',
        concertId: 'concert',
        latestBatchId: 'batch',
        guestName: 'VIP',
        normalizedEmail: 'vip@x.test',
        email: 'vip@x.test',
        status: GuestListEntryStatus.ACTIVE,
      }),
    };
    const assignments = { findAssignmentById: vi.fn().mockResolvedValue(assignment) };
    const result = await new LookupVipGuestUseCase(
      repository as never,
      assignments as never,
    ).execute({
      actor,
      assignmentId: 'assignment',
      concertId: 'concert',
      gate: 'VIP',
      lookupType: 'email',
      value: ' VIP@X.TEST ',
    });
    expect(result).toMatchObject({ status: 'found', guest: { guestName: 'VIP' } });
    expect(repository.findActiveGuest).toHaveBeenCalledWith({
      concertId: 'concert',
      normalizedEmail: 'vip@x.test',
    });
  });
  it.each([
    null,
    { ...assignment, staffUserId: 'other' },
    { ...assignment, status: 'REVOKED' },
    { ...assignment, concertId: 'other' },
  ])(
    'rejects a missing, revoked, other-staff, or other-concert selected assignment',
    async (selected) => {
      const useCase = new LookupVipGuestUseCase(
        { findActiveGuest: vi.fn() } as never,
        { findAssignmentById: vi.fn().mockResolvedValue(selected) } as never,
      );
      await expect(
        useCase.execute({
          actor,
          assignmentId: 'assignment',
          concertId: 'concert',
          gate: 'VIP',
          lookupType: 'email',
          value: 'vip@x.test',
        }),
      ).rejects.toThrow();
    },
  );
  it('rejects gate mismatch and never substitutes another valid assignment', async () => {
    const useCase = new LookupVipGuestUseCase(
      { findActiveGuest: vi.fn() } as never,
      { findAssignmentById: vi.fn().mockResolvedValue(assignment) } as never,
    );
    await expect(
      useCase.execute({
        actor,
        assignmentId: 'assignment',
        concertId: 'concert',
        gate: 'OTHER',
        lookupType: 'email',
        value: 'vip@x.test',
      }),
    ).rejects.toThrow();
  });
});
