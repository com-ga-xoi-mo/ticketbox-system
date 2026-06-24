import type { CheckinStaffAssignmentRepositoryPort } from '../../../identity/domain/ports/checkin-staff-assignment.port';
import type { OnlineScanActor } from '../../domain/checkin-scan.types';
import type {
  TicketCacheDelta,
  TicketCacheHashEntry,
  TicketCacheQueryPort,
} from '../../domain/ports/ticket-cache-query.port';

export interface GetTicketCacheCommand {
  actor: OnlineScanActor;
  assignmentId: string;
  concertId: string;
  since?: Date;
}

export type GetTicketCacheResult =
  | { kind: 'full'; entries: TicketCacheHashEntry[]; syncedAt: Date }
  | { kind: 'delta'; upserted: TicketCacheDelta['upserted']; voided: TicketCacheDelta['voided']; syncedAt: Date }
  | { kind: 'forbidden'; reason: string }
  | { kind: 'bad-request'; reason: string };

export class GetTicketCacheUseCase {
  constructor(
    private readonly cacheQuery: TicketCacheQueryPort,
    private readonly assignments: CheckinStaffAssignmentRepositoryPort,
  ) {}

  async execute(command: GetTicketCacheCommand): Promise<GetTicketCacheResult> {
    const assignment = await this.assignments.findAssignmentById(command.assignmentId);

    if (!assignment || assignment.staffUserId !== command.actor.userId) {
      return { kind: 'forbidden', reason: 'Assignment not found or does not belong to you.' };
    }

    if (assignment.status !== 'ACTIVE') {
      return { kind: 'forbidden', reason: 'Assignment is revoked.' };
    }

    if (assignment.concertId !== command.concertId) {
      return { kind: 'bad-request', reason: 'Concert does not match the assignment.' };
    }

    const syncedAt = new Date();

    if (command.since) {
      const delta = await this.cacheQuery.getDeltaCache(command.concertId, command.since);
      return { kind: 'delta', ...delta, syncedAt };
    }

    const entries = await this.cacheQuery.getFullCache(command.concertId);
    return { kind: 'full', entries, syncedAt };
  }
}
