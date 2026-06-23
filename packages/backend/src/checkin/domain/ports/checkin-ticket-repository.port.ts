import type {
  AcceptedScanPersistenceResult,
  CheckinTicketRecord,
  RecordAcceptedScanInput,
  PersistedOfflineEvent,
  RecordOfflineOutcomeInput,
  RecordRejectedScanInput,
} from '../checkin-scan.types';

export const CHECKIN_TICKET_REPOSITORY = Symbol('CheckinTicketRepository');

export interface CheckinTicketRepositoryPort {
  findByQrTokenHash(qrTokenHash: string): Promise<CheckinTicketRecord | null>;

  hasAcceptedCheckin(ticketId: string): Promise<boolean>;

  recordAcceptedScan(input: RecordAcceptedScanInput): Promise<AcceptedScanPersistenceResult>;

  recordRejectedScan(input: RecordRejectedScanInput): Promise<{ id: string } | null>;

  findOfflineEvent(deviceId: string, localId: string): Promise<PersistedOfflineEvent | null>;

  recordOfflineOutcome(input: RecordOfflineOutcomeInput): Promise<PersistedOfflineEvent | null>;
}
