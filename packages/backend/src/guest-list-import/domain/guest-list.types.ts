import type {
  GuestListBatchStatus,
  GuestListEntryStatus,
  GuestListRowDisposition,
} from '@prisma/client';

export type GuestListAction = 'UPSERT' | 'CANCEL';

export interface GuestIdentity {
  email?: string;
  normalizedEmail?: string;
  phone?: string;
  normalizedPhone?: string;
  externalRef?: string;
}

export interface ParsedGuestListRow extends GuestIdentity {
  rowNumber: number;
  action: GuestListAction;
  guestName?: string;
  validationReason?: string;
}

export interface GuestListBatchRecord {
  id: string;
  concertId: string;
  assetId?: string;
  uploadedById?: string;
  sourceName: string;
  sourceStorageKey?: string;
  sourceContentType?: string;
  checksum?: string;
  importSequence: number;
  status: GuestListBatchStatus;
  processingAttempt: number;
  leaseOwner?: string;
  leaseExpiresAt?: Date;
  reportStorageKey?: string;
  failureCode?: string;
  failureMessage?: string;
  createdAt: Date;
}

export interface ActiveGuestRecord extends GuestIdentity {
  id: string;
  concertId: string;
  latestBatchId: string;
  guestName: string;
  status: GuestListEntryStatus;
  cancelledAt?: Date;
}

export interface ImportRowOutcome extends ParsedGuestListRow {
  disposition: GuestListRowDisposition;
  reasonCode?: string;
  reasonMessage?: string;
  guestEntryId?: string;
}

export interface GuestListReportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  importedRows: number;
  updatedRows: number;
  cancelledRows: number;
  conflictRows: number;
}
