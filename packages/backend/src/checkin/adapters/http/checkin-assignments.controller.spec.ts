import { StaffAssignmentsResponseSchema } from '@ticketbox/api-types';
import { describe, expect, it, vi } from 'vitest';

import { Role } from '../../../identity/domain/role.enum';
import type { ListMyCheckinAssignmentsQuery } from '../../application/queries/list-my-checkin-assignments.query';
import { CheckinAssignmentsController } from './checkin-assignments.controller';

describe('CheckinAssignmentsController', () => {
  it('returns a shared raw array mapped from the local read model', async () => {
    const query = {
      execute: vi.fn().mockResolvedValue([
        {
          assignmentId: '11111111-1111-4111-8111-111111111111',
          concertId: '22222222-2222-4222-8222-222222222222',
          concertTitle: 'TicketBox Live',
          startsAt: new Date('2026-07-01T12:00:00.000Z'),
          status: 'ACTIVE',
        },
      ]),
    };
    const controller = new CheckinAssignmentsController(
      query as unknown as ListMyCheckinAssignmentsQuery,
    );
    const result = await controller.list({
      user: { id: 'jwt-staff', roles: [Role.CHECKIN_STAFF] },
    });

    expect(Array.isArray(result)).toBe(true);
    expect(StaffAssignmentsResponseSchema.parse(result)).toEqual(result);
    expect(query.execute).toHaveBeenCalledWith('jwt-staff');
  });

  it('returns [] without an envelope', async () => {
    const query = { execute: vi.fn().mockResolvedValue([]) };
    const controller = new CheckinAssignmentsController(
      query as unknown as ListMyCheckinAssignmentsQuery,
    );
    await expect(
      controller.list({ user: { id: 'staff', roles: [Role.CHECKIN_STAFF] } }),
    ).resolves.toEqual([]);
    expect(StaffAssignmentsResponseSchema.safeParse({ assignments: [] }).success).toBe(false);
  });
});
