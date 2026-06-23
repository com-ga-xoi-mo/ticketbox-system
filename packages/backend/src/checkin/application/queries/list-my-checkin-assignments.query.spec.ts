import { describe, expect, it, vi } from 'vitest';

import type { StaffAssignmentQueryPort } from '../ports/staff-assignment-query.port';
import { ListMyCheckinAssignmentsQuery } from './list-my-checkin-assignments.query';

describe('ListMyCheckinAssignmentsQuery', () => {
  it('uses only the JWT-derived staff id', async () => {
    const port: StaffAssignmentQueryPort = { listActiveByStaffId: vi.fn().mockResolvedValue([]) };
    await expect(new ListMyCheckinAssignmentsQuery(port).execute('jwt-staff-id')).resolves.toEqual(
      [],
    );
    expect(port.listActiveByStaffId).toHaveBeenCalledWith('jwt-staff-id');
  });
});
