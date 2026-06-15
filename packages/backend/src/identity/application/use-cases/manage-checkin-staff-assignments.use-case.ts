import {
  CheckinStaffUserNotFoundError,
  UserIsNotCheckinStaffError,
} from '../../domain/errors';
import type {
  CheckinStaffAssignmentRecord,
  CheckinStaffAssignmentRepositoryPort,
} from '../../domain/ports/checkin-staff-assignment.port';
import type { AuthorizeConcertManagementUseCase } from './authorize-concert-management.use-case';
import type { Actor, ManageCheckinAssignmentCommand } from './authorization.types';

export class ManageCheckinStaffAssignmentsUseCase {
  constructor(
    private readonly assignmentRepo: CheckinStaffAssignmentRepositoryPort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async assign(cmd: ManageCheckinAssignmentCommand): Promise<CheckinStaffAssignmentRecord> {
    await this.authorizeConcertManagement.execute({
      actor: cmd.actor,
      concertId: cmd.concertId,
      allowAdminOverride: true,
    });

    const hasStaffRole = await this.assignmentRepo.userHasCheckinStaffRole(cmd.staffUserId);
    if (hasStaffRole === null) {
      throw new CheckinStaffUserNotFoundError(cmd.staffUserId);
    }
    if (!hasStaffRole) {
      throw new UserIsNotCheckinStaffError(cmd.staffUserId);
    }

    return this.assignmentRepo.createActiveAssignment({
      staffUserId: cmd.staffUserId,
      concertId: cmd.concertId,
      gateName: cmd.gateName,
    });
  }

  async revoke(params: {
    actor: Actor;
    assignmentId: string;
    concertId: string;
  }): Promise<CheckinStaffAssignmentRecord> {
    await this.authorizeConcertManagement.execute({
      actor: params.actor,
      concertId: params.concertId,
      allowAdminOverride: true,
    });

    return this.assignmentRepo.revokeAssignment({
      assignmentId: params.assignmentId,
      concertId: params.concertId,
    });
  }

  async listActive(params: {
    actor: Actor;
    concertId: string;
  }): Promise<CheckinStaffAssignmentRecord[]> {
    await this.authorizeConcertManagement.execute({
      actor: params.actor,
      concertId: params.concertId,
      allowAdminOverride: true,
    });

    return this.assignmentRepo.listActiveAssignments(params.concertId);
  }
}
