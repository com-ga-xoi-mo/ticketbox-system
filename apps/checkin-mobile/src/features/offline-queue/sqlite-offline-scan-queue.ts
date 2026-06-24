import type { SqliteDatabase } from './sqlite-database.port';
import type {
  NewOfflineScanEvent,
  OfflineScanEvent,
  OfflineScanQueue,
} from './offline-scan-queue.port';

interface QueueRow {
  local_id: string;
  staff_user_id: string;
  device_id: string;
  scanned_at: string;
  qr_payload_hash: string;
  assignment_id: string;
  concert_id: string;
  gate: string | null;
  sync_status: 'pending' | 'synced' | 'failed';
  terminal_status: 'invalid' | 'conflict' | 'unassigned' | null;
  failure_reason: string | null;
  synced_at: string | null;
}

export class SqliteOfflineScanQueue implements OfflineScanQueue {
  constructor(private readonly database: SqliteDatabase) {}

  async initialize(): Promise<void> {
    await this.database.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS offline_scan_events (
        local_id TEXT PRIMARY KEY NOT NULL,
        staff_user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        scanned_at TEXT NOT NULL,
        qr_payload_hash TEXT NOT NULL,
        assignment_id TEXT NOT NULL,
        concert_id TEXT NOT NULL,
        gate TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        terminal_status TEXT,
        failure_reason TEXT,
        synced_at TEXT
      );
      CREATE INDEX IF NOT EXISTS offline_scan_events_owner_status_scanned
        ON offline_scan_events (staff_user_id, sync_status, scanned_at);
      PRAGMA user_version = 1;
    `);
  }

  async enqueue(event: NewOfflineScanEvent): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO offline_scan_events
       (local_id, staff_user_id, device_id, scanned_at, qr_payload_hash, assignment_id, concert_id, gate, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      event.localId,
      event.staffUserId,
      event.deviceId,
      event.scannedAt,
      event.qrPayloadHash,
      event.assignmentId,
      event.concertId,
      event.gate ?? null,
    );
  }

  async getPendingScanEvents(staffUserId: string, limit: number): Promise<OfflineScanEvent[]> {
    const boundedLimit = Math.max(0, Math.min(100, Math.trunc(limit)));
    const rows = await this.database.getAllAsync<QueueRow>(
      `SELECT * FROM offline_scan_events
       WHERE staff_user_id = ? AND sync_status = 'pending'
       ORDER BY scanned_at ASC, local_id ASC LIMIT ?`,
      staffUserId,
      boundedLimit,
    );
    return rows.map(toEvent);
  }

  async getFailedScanEvents(staffUserId: string): Promise<OfflineScanEvent[]> {
    const rows = await this.database.getAllAsync<QueueRow>(
      `SELECT * FROM offline_scan_events
       WHERE staff_user_id = ? AND sync_status = 'failed'
       ORDER BY scanned_at ASC, local_id ASC`,
      staffUserId,
    );
    return rows.map(toEvent);
  }

  async markSynced(staffUserId: string, localId: string, syncedAt: string): Promise<void> {
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `UPDATE offline_scan_events SET sync_status = 'synced', synced_at = ?, terminal_status = NULL,
         failure_reason = NULL WHERE staff_user_id = ? AND local_id = ?`,
        syncedAt,
        staffUserId,
        localId,
      );
    });
  }

  async markFailed(
    staffUserId: string,
    localId: string,
    terminalStatus: 'invalid' | 'conflict' | 'unassigned',
    reason: string,
  ): Promise<void> {
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `UPDATE offline_scan_events SET sync_status = 'failed', terminal_status = ?, failure_reason = ?
         WHERE staff_user_id = ? AND local_id = ?`,
        terminalStatus,
        reason,
        staffUserId,
        localId,
      );
    });
  }

  async getPendingCount(staffUserId: string): Promise<number> {
    const rows = await this.database.getAllAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM offline_scan_events
       WHERE staff_user_id = ? AND sync_status = 'pending'`,
      staffUserId,
    );
    return rows[0]?.count ?? 0;
  }

  async clearSynced(staffUserId: string): Promise<void> {
    await this.database.runAsync(
      `DELETE FROM offline_scan_events WHERE staff_user_id = ? AND sync_status = 'synced'`,
      staffUserId,
    );
  }

  async clearTerminalResults(staffUserId: string): Promise<void> {
    await this.database.runAsync(
      `DELETE FROM offline_scan_events WHERE staff_user_id = ? AND sync_status = 'failed'`,
      staffUserId,
    );
  }
}

function toEvent(row: QueueRow): OfflineScanEvent {
  return {
    localId: row.local_id,
    staffUserId: row.staff_user_id,
    deviceId: row.device_id,
    scannedAt: row.scanned_at,
    qrPayloadHash: row.qr_payload_hash,
    assignmentId: row.assignment_id,
    concertId: row.concert_id,
    ...(row.gate ? { gate: row.gate } : {}),
    syncStatus: row.sync_status,
    ...(row.terminal_status ? { terminalStatus: row.terminal_status } : {}),
    ...(row.failure_reason ? { failureReason: row.failure_reason } : {}),
    ...(row.synced_at ? { syncedAt: row.synced_at } : {}),
  };
}
