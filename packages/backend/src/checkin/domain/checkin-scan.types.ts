import type { Role } from '../../identity/domain/role.enum';

export type OnlineScanStatus = 'accepted' | 'duplicate' | 'invalid' | 'unassigned';

export type OnlineScanReasonCode =
  | 'INVALID_TICKET'
  | 'WRONG_CONCERT'
  | 'TICKET_NOT_ISSUED'
  | 'REVOKED_ASSIGNMENT'
  | 'ASSIGNMENT_MISMATCH';

export type PersistedCheckinResult =
  | 'ACCEPTED'
  | 'DUPLICATE'
  | 'INVALID'
  | 'WRONG_CONCERT'
  | 'UNASSIGNED_STAFF';

export type TicketCheckinStatus = 'ISSUED' | 'CHECKED_IN' | 'VOIDED' | 'REFUNDED';

export interface OnlineScanActor {
  userId: string;
  roles: Role[];
}

export interface OnlineScanCommand {
  actor: OnlineScanActor;
  assignmentId: string;
  concertId: string;
  gateName?: string;
  qrPayload: string;
  scannedAt: Date;
  deviceId?: string;
}

export interface CheckinTicketRecord {
  id: string;
  concertId: string;
  status: TicketCheckinStatus;
  checkedInAt?: Date;
  qrTokenHash: string;
}

export interface OnlineScanResult {
  status: OnlineScanStatus;
  message: string;
  reasonCode?: OnlineScanReasonCode;
  ticketId?: string;
  checkinEventId?: string;
  checkedInAt?: Date;
}

export interface AcceptedScanPersistenceResult {
  status: 'accepted' | 'duplicate';
  ticketId: string;
  checkinEventId?: string;
  checkedInAt?: Date;
}

export interface RecordRejectedScanInput {
  ticketId?: string;
  concertId: string;
  staffId: string;
  scannedQrHash: string;
  deviceId?: string;
  occurredAt: Date;
  result: Exclude<PersistedCheckinResult, 'ACCEPTED'>;
  rejectionReason?: OnlineScanReasonCode;
}

export interface RecordAcceptedScanInput {
  ticketId: string;
  concertId: string;
  staffId: string;
  scannedQrHash: string;
  deviceId?: string;
  occurredAt: Date;
}
