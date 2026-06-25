import type {
  ActiveGuestRecord,
  GuestListBatchRecord,
  GuestListReportSummary,
  ImportRowOutcome,
  ParsedGuestListRow,
} from '../guest-list.types';

export const GUEST_LIST_REPOSITORY = Symbol('GuestListRepositoryPort');

export interface ClaimGuestListBatchInput {
  concertId: string;
  uploadedById?: string;
  sourceName: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  checksum: string;
}

export interface GuestListRepositoryPort {
  concertExists(concertId: string): Promise<boolean>;
  claimBatch(
    input: ClaimGuestListBatchInput,
  ): Promise<{ batch: GuestListBatchRecord; created: boolean }>;
  findBatch(batchId: string): Promise<GuestListBatchRecord | null>;
  listBatches(concertId: string): Promise<GuestListBatchRecord[]>;
  listPendingBatchIds(): Promise<string[]>;
  claimProcessingLease(input: {
    batchId: string;
    owner: string;
    now: Date;
    expiresAt: Date;
  }): Promise<GuestListBatchRecord | null>;
  releaseProcessingLease(batchId: string): Promise<void>;
  hasEarlierNonTerminal(batch: GuestListBatchRecord): Promise<boolean>;
  findIdentityCandidates(concertId: string, row: ParsedGuestListRow): Promise<ActiveGuestRecord[]>;
  applyRow(batch: GuestListBatchRecord, outcome: ImportRowOutcome): Promise<ImportRowOutcome>;
  summarizeRows(batchId: string): Promise<GuestListReportSummary>;
  listRows(batchId: string): Promise<ImportRowOutcome[]>;
  completeBatch(
    batchId: string,
    summary: GuestListReportSummary,
    reportStorageKey: string,
  ): Promise<void>;
  failBatch(batchId: string, code: string, message: string): Promise<void>;
  findActiveGuest(input: {
    concertId: string;
    normalizedEmail?: string;
    normalizedPhone?: string;
    externalRef?: string;
  }): Promise<ActiveGuestRecord | null>;
}
