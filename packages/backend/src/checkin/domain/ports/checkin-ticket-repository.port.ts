import type {
  AcceptedScanPersistenceResult,
  CheckinTicketRecord,
  RecordAcceptedScanInput,
  RecordRejectedScanInput,
} from '../checkin-scan.types';

export const CHECKIN_TICKET_REPOSITORY = Symbol('CheckinTicketRepository');

export interface CheckinTicketRepositoryPort {
  findByQrTokenHash(qrTokenHash: string): Promise<CheckinTicketRecord | null>;

  hasAcceptedCheckin(ticketId: string): Promise<boolean>;

  recordAcceptedScan(
    input: RecordAcceptedScanInput,
  ): Promise<AcceptedScanPersistenceResult>;

  recordRejectedScan(input: RecordRejectedScanInput): Promise<{ id: string } | null>;
}
