import {
  CheckinGateMismatchError,
  MissingActiveCheckinAssignmentError,
  MissingCheckinStaffRoleError,
} from '../../domain/errors';
import type { CheckinStaffAssignmentRepositoryPort } from '../../domain/ports/checkin-staff-assignment.port';
import { Role } from '../../domain/role.enum';
import type { CheckinAssignmentAuthorizationCommand } from './authorization.types';

export class AuthorizeCheckinAssignmentUseCase {
  constructor(private readonly checkinAssignmentRepo: CheckinStaffAssignmentRepositoryPort) {}

  async execute(cmd: CheckinAssignmentAuthorizationCommand): Promise<void> {
    if (!cmd.actor.roles.includes(Role.CHECKIN_STAFF)) {
      throw new MissingCheckinStaffRoleError();
    }

    const assignment = await this.checkinAssignmentRepo.findActiveAssignment({
      staffUserId: cmd.actor.userId,
      concertId: cmd.concertId,
      gateName: cmd.gateName,
    });

    if (!assignment) {
      throw new MissingActiveCheckinAssignmentError(cmd.concertId);
    }

    if (cmd.gateName && assignment.gateName && assignment.gateName !== cmd.gateName) {
      throw new CheckinGateMismatchError(cmd.gateName);
    }
  }
}
