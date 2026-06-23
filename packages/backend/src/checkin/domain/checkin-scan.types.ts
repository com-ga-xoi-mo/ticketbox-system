import type { Role } from '../../identity/domain/role.enum';

export type InvalidScanReasonCode = 'INVALID_TICKET' | 'WRONG_CONCERT' | 'TICKET_NOT_ISSUED';

export type UnassignedScanReasonCode = 'REVOKED_ASSIGNMENT' | 'ASSIGNMENT_MISMATCH';

export type OnlineScanReasonCode = InvalidScanReasonCode | UnassignedScanReasonCode;

export type PersistedCheckinResult =
  | 'ACCEPTED'
  | 'DUPLICATE'
  | 'INVALID'
  | 'WRONG_CONCERT'
  | 'UNASSIGNED_STAFF';

export type PersistedBatchCheckinResult = PersistedCheckinResult | 'CONFLICT';

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
  deviceId: string;
}

export interface CheckinTicketRecord {
  id: string;
  concertId: string;
  status: TicketCheckinStatus;
  checkedInAt?: Date;
  qrTokenHash: string;
}

export interface AcceptedOnlineScanResult {
  status: 'accepted';
  message: string;
  ticketId: string;
  checkedInAt: Date;
  checkinEventId?: string;
}

export interface DuplicateOnlineScanResult {
  status: 'duplicate';
  message: string;
  ticketId?: string;
  checkedInAt?: Date;
  checkinEventId?: string;
}

export interface InvalidOnlineScanResult {
  status: 'invalid';
  message: string;
  reasonCode: InvalidScanReasonCode;
  ticketId?: string;
  checkinEventId?: string;
}

export interface UnassignedOnlineScanResult {
  status: 'unassigned';
  message: string;
  reasonCode: UnassignedScanReasonCode;
  checkinEventId?: string;
}

export type OnlineScanResult =
  | AcceptedOnlineScanResult
  | DuplicateOnlineScanResult
  | InvalidOnlineScanResult
  | UnassignedOnlineScanResult;

export type AcceptedScanPersistenceResult =
  | {
      status: 'accepted';
      ticketId: string;
      checkinEventId?: string;
      checkedInAt: Date;
    }
  | {
      status: 'duplicate';
      ticketId: string;
      checkinEventId?: string;
      checkedInAt?: Date;
      acceptedByDeviceId?: string;
    };

export interface RecordRejectedScanInput {
  ticketId?: string;
  concertId: string;
  staffId: string;
  scannedQrHash: string;
  deviceId: string;
  occurredAt: Date;
  result: Exclude<PersistedCheckinResult, 'ACCEPTED'>;
  rejectionReason?: OnlineScanReasonCode;
}

export interface RecordAcceptedScanInput {
  ticketId: string;
  concertId: string;
  staffId: string;
  scannedQrHash: string;
  deviceId: string;
  occurredAt: Date;
  source?: 'ONLINE' | 'OFFLINE_SYNC';
  offlineEventId?: string;
  syncedAt?: Date;
}

export interface BatchSyncEventCommand {
  localId: string;
  assignmentId: string;
  concertId: string;
  gateName?: string;
  qrPayloadHash: string;
  scannedAt: Date;
  deviceId: string;
}

export interface BatchSyncCommand {
  actor: OnlineScanActor;
  events: BatchSyncEventCommand[];
}

export type BatchSyncEventResult =
  | { localId: string; status: 'accepted'; message: string; ticketId: string; checkedInAt: Date }
  | { localId: string; status: 'duplicate'; message: string }
  | { localId: string; status: 'invalid'; message: string; reasonCode: InvalidScanReasonCode }
  | { localId: string; status: 'conflict'; message: string; conflictReason: string }
  | {
      localId: string;
      status: 'unassigned';
      message: string;
      reasonCode: UnassignedScanReasonCode;
    };

export interface BatchSyncResult {
  events: BatchSyncEventResult[];
}

export interface PersistedOfflineEvent {
  staffId: string;
  ticketId?: string;
  result: PersistedBatchCheckinResult;
  rejectionReason?: string;
  checkedInAt?: Date;
}

export interface RecordOfflineOutcomeInput {
  localId: string;
  ticketId?: string;
  concertId: string;
  staffId: string;
  scannedQrHash: string;
  deviceId: string;
  occurredAt: Date;
  syncedAt: Date;
  result: Exclude<PersistedBatchCheckinResult, 'ACCEPTED'>;
  rejectionReason?: string;
}
