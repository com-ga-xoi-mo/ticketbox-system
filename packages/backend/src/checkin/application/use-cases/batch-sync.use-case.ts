import type {
  BatchSyncCommand,
  BatchSyncEventCommand,
  BatchSyncEventResult,
  BatchSyncResult,
  PersistedOfflineEvent,
} from '../../domain/checkin-scan.types';
import type { CheckinTicketRepositoryPort } from '../../domain/ports/checkin-ticket-repository.port';
import type { TicketCacheQueryPort } from '../../domain/ports/ticket-cache-query.port';
import type { ScanValidationService } from '../services/scan-validation.service';

export class BatchSyncUseCase {
  constructor(
    private readonly tickets: CheckinTicketRepositoryPort,
    private readonly validation: ScanValidationService,
    private readonly cacheQuery: TicketCacheQueryPort,
  ) {}

  async execute(command: BatchSyncCommand): Promise<BatchSyncResult> {
    const events: BatchSyncEventResult[] = [];
    for (const event of command.events) {
      events.push(await this.processEvent(command.actor.userId, command.actor, event));
    }

    if (!command.since) return { events };

    const syncedAt = new Date();
    const delta = await this.cacheQuery.getDeltaCache(
      command.concertId ?? command.events[0]?.concertId ?? '',
      command.since,
    );
    return {
      events,
      cacheUpdates: { ...delta, syncedAt },
    };
  }

  private async processEvent(
    staffId: string,
    actor: BatchSyncCommand['actor'],
    event: BatchSyncEventCommand,
  ): Promise<BatchSyncEventResult> {
    const replay = await this.tickets.findOfflineEvent(event.deviceId, event.localId);
    if (replay) {
      if (replay.staffId !== staffId) {
        return {
          localId: event.localId,
          status: 'unassigned',
          message: 'Offline event belongs to another staff account.',
          reasonCode: 'ASSIGNMENT_MISMATCH',
        };
      }
      return this.mapReplay(event.localId, replay);
    }

    const validation = await this.validation.validate({
      actor,
      assignmentId: event.assignmentId,
      concertId: event.concertId,
      gateName: event.gateName,
      qrTokenHash: event.qrPayloadHash,
    });
    const syncedAt = new Date();
    if (validation.status !== 'valid') {
      const result = validation.status === 'unassigned' ? 'UNASSIGNED_STAFF' : validation.reasonCode === 'WRONG_CONCERT' ? 'WRONG_CONCERT' : 'INVALID';
      const persisted = await this.tickets.recordOfflineOutcome({
        localId: event.localId,
        ticketId: validation.status === 'invalid' ? validation.ticket?.id : undefined,
        concertId: event.concertId,
        staffId,
        scannedQrHash: event.qrPayloadHash,
        deviceId: event.deviceId,
        occurredAt: event.scannedAt,
        syncedAt,
        result,
        rejectionReason: validation.reasonCode,
      });
      if (persisted) return this.mapReplay(event.localId, persisted);
      return { localId: event.localId, ...validation };
    }

    const claim = await this.tickets.recordAcceptedScan({
      ticketId: validation.ticket.id,
      concertId: event.concertId,
      staffId,
      scannedQrHash: event.qrPayloadHash,
      deviceId: event.deviceId,
      occurredAt: event.scannedAt,
      source: 'OFFLINE_SYNC',
      offlineEventId: event.localId,
      syncedAt,
    });
    if (claim.status === 'accepted') {
      return {
        localId: event.localId,
        status: 'accepted',
        message: 'Ticket check-in accepted.',
        ticketId: claim.ticketId,
        checkedInAt: claim.checkedInAt,
      };
    }

    const sameDevice = claim.acceptedByDeviceId === event.deviceId;
    const persisted = await this.tickets.recordOfflineOutcome({
      localId: event.localId,
      ticketId: validation.ticket.id,
      concertId: event.concertId,
      staffId,
      scannedQrHash: event.qrPayloadHash,
      deviceId: event.deviceId,
      occurredAt: event.scannedAt,
      syncedAt,
      result: sameDevice ? 'DUPLICATE' : 'CONFLICT',
      rejectionReason: sameDevice ? undefined : 'Ticket was accepted on another device.',
    });
    if (persisted) return this.mapReplay(event.localId, persisted);
    return sameDevice
      ? { localId: event.localId, status: 'duplicate', message: 'Ticket has already been checked in.' }
      : {
          localId: event.localId,
          status: 'conflict',
          message: 'Ticket was accepted on another device.',
          conflictReason: 'Ticket was accepted on another device.',
        };
  }

  private mapReplay(localId: string, replay: PersistedOfflineEvent): BatchSyncEventResult {
    switch (replay.result) {
      case 'ACCEPTED':
        if (!replay.ticketId || !replay.checkedInAt) throw new Error('Corrupt accepted offline event');
        return { localId, status: 'accepted', message: 'Ticket check-in accepted.', ticketId: replay.ticketId, checkedInAt: replay.checkedInAt };
      case 'DUPLICATE':
        return { localId, status: 'duplicate', message: 'Ticket has already been checked in.' };
      case 'CONFLICT':
        return { localId, status: 'conflict', message: replay.rejectionReason ?? 'Ticket conflict.', conflictReason: replay.rejectionReason ?? 'Ticket conflict.' };
      case 'UNASSIGNED_STAFF':
        return { localId, status: 'unassigned', message: 'Check-in staff is not assigned.', reasonCode: replay.rejectionReason === 'REVOKED_ASSIGNMENT' ? 'REVOKED_ASSIGNMENT' : 'ASSIGNMENT_MISMATCH' };
      case 'WRONG_CONCERT':
      case 'INVALID':
        return { localId, status: 'invalid', message: 'Ticket is invalid.', reasonCode: replay.rejectionReason === 'WRONG_CONCERT' || replay.rejectionReason === 'TICKET_NOT_ISSUED' ? replay.rejectionReason : 'INVALID_TICKET' };
    }
  }
}
