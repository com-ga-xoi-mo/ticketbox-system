import type { Role } from '../../domain/role.enum';

export interface Actor {
  userId: string;
  roles: Role[];
}

export interface ConcertAuthorizationCommand {
  actor: Actor;
  concertId: string;
  allowAdminOverride?: boolean;
}

export interface CheckinAssignmentAuthorizationCommand {
  actor: Actor;
  concertId: string;
  gateName?: string;
}

export interface ManageCheckinAssignmentCommand {
  actor: Actor;
  concertId: string;
  staffUserId: string;
  gateName?: string;
}
