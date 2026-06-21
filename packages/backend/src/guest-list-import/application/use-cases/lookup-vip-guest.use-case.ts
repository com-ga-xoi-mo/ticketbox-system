import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import {
  CheckinGateMismatchError,
  MissingActiveCheckinAssignmentError,
  MissingCheckinStaffRoleError,
} from '../../../identity/domain/errors';
import type { CheckinStaffAssignmentRepositoryPort } from '../../../identity/domain/ports/checkin-staff-assignment.port';
import { Role } from '../../../identity/domain/role.enum';
import { normalizeEmail, normalizeExternalRef, normalizePhone } from '../../domain/normalization';
import type { GuestListRepositoryPort } from '../../domain/ports/guest-list-repository.port';

export class LookupVipGuestUseCase {
  constructor(
    private readonly repository: GuestListRepositoryPort,
    private readonly assignments: CheckinStaffAssignmentRepositoryPort,
  ) {}
  async execute(command: {
    actor: AuthenticatedUser;
    assignmentId: string;
    concertId: string;
    gate?: string;
    lookupType: 'email' | 'phone' | 'external_ref';
    value: string;
  }) {
    if (!command.actor.roles.includes(Role.CHECKIN_STAFF)) throw new MissingCheckinStaffRoleError();
    const assignment = await this.assignments.findAssignmentById(command.assignmentId);
    if (
      !assignment ||
      assignment.staffUserId !== command.actor.id ||
      assignment.status !== 'ACTIVE' ||
      assignment.concertId !== command.concertId
    ) {
      throw new MissingActiveCheckinAssignmentError(command.concertId);
    }
    if (command.gate && assignment.gateName && assignment.gateName !== command.gate)
      throw new CheckinGateMismatchError(command.gate);
    const query =
      command.lookupType === 'email'
        ? { normalizedEmail: normalizeEmail(command.value) }
        : command.lookupType === 'phone'
          ? { normalizedPhone: normalizePhone(command.value) }
          : { externalRef: normalizeExternalRef(command.value) };
    const guest = await this.repository.findActiveGuest({ concertId: command.concertId, ...query });
    return guest
      ? {
          status: 'found' as const,
          guest: {
            id: guest.id,
            guestName: guest.guestName,
            email: guest.email,
            phone: guest.phone,
            externalRef: guest.externalRef,
          },
        }
      : { status: 'not_found' as const };
  }
}
