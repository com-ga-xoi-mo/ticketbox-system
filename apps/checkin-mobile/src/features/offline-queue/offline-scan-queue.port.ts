export type OfflineScanSyncStatus = 'pending' | 'synced' | 'failed';

export interface OfflineScanEvent {
  readonly localId: string;
  readonly staffUserId: string;
  readonly deviceId: string;
  readonly scannedAt: string;
  readonly qrPayloadHash: string;
  readonly assignmentId: string;
  readonly concertId: string;
  readonly gate?: string;
  readonly syncStatus: OfflineScanSyncStatus;
  readonly terminalStatus?: 'invalid' | 'conflict' | 'unassigned';
  readonly failureReason?: string;
  readonly syncedAt?: string;
}

export type NewOfflineScanEvent = Omit<
  OfflineScanEvent,
  'syncStatus' | 'terminalStatus' | 'failureReason' | 'syncedAt'
>;

export interface OfflineScanQueue {
  enqueue(event: NewOfflineScanEvent): Promise<void>;
  getPendingScanEvents(staffUserId: string, limit: number): Promise<OfflineScanEvent[]>;
  getFailedScanEvents(staffUserId: string): Promise<OfflineScanEvent[]>;
  markSynced(staffUserId: string, localId: string, syncedAt: string): Promise<void>;
  markFailed(
    staffUserId: string,
    localId: string,
    terminalStatus: 'invalid' | 'conflict' | 'unassigned',
    reason: string,
  ): Promise<void>;
  getPendingCount(staffUserId: string): Promise<number>;
  clearSynced(staffUserId: string): Promise<void>;
  clearTerminalResults(staffUserId: string): Promise<void>;
}
