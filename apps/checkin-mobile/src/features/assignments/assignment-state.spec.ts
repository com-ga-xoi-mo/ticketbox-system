import { describe, expect, it } from 'vitest';

import type { AssignmentApiClient, StaffAssignment } from '../../api/checkin-mobile-api.types';
import { activeAssignment, secondAssignment, staffSession } from '../../test/fixtures';
import { AssignmentController } from './assignment-state';

class FakeAssignmentApi implements AssignmentApiClient {
  constructor(private readonly assignments: readonly StaffAssignment[]) {}

  async listStaffAssignments(): Promise<readonly StaffAssignment[]> {
    return this.assignments;
  }
}

describe('AssignmentController', () => {
  it('loads active assignments and selects the first one by default', async () => {
    const controller = new AssignmentController(
      new FakeAssignmentApi([activeAssignment, secondAssignment]),
    );

    const state = await controller.load(staffSession);

    expect(state).toEqual({
      status: 'loaded',
      assignments: [activeAssignment, secondAssignment],
      selected: activeAssignment,
    });
    expect(controller.canOpenScanner(state)).toBe(true);
  });

  it('returns empty when the active-assignment API returns an empty array', async () => {
    const controller = new AssignmentController(new FakeAssignmentApi([]));

    const state = await controller.load(staffSession);

    expect(state).toEqual({ status: 'empty' });
    expect(controller.canOpenScanner(state)).toBe(false);
  });

  it('keeps assignment loading errors recoverable', async () => {
    const controller = new AssignmentController({
      async listStaffAssignments() {
        throw new Error('Unauthorized');
      },
    });

    const state = await controller.load(staffSession);

    expect(state).toEqual({ status: 'error', message: 'Unauthorized' });
  });

  it('updates the selected assignment by id', async () => {
    const controller = new AssignmentController(
      new FakeAssignmentApi([activeAssignment, secondAssignment]),
    );
    const loaded = await controller.load(staffSession);

    const selected = controller.select(loaded, secondAssignment.assignmentId);

    expect(selected.status).toBe('loaded');
    if (selected.status === 'loaded') {
      expect(selected.selected).toEqual(secondAssignment);
    }
  });
});
