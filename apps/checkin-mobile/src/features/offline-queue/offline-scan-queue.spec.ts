import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import type { SqliteDatabase } from './sqlite-database.port';
import { SqliteOfflineScanQueue } from './sqlite-offline-scan-queue';
import { createQrHasher } from './qr-hasher';

type Row = Record<string, unknown>;

class FakeSqliteDatabase implements SqliteDatabase {
  readonly rows: Map<string, Row>;
  initializedSql = '';

  constructor(rows = new Map<string, Row>()) {
    this.rows = rows;
  }

  async execAsync(sql: string): Promise<void> {
    this.initializedSql += sql;
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number }> {
    if (sql.includes('INSERT INTO')) {
      const [localId, staffUserId, deviceId, scannedAt, qrPayloadHash, assignmentId, concertId, gate] = params;
      if (this.rows.has(String(localId))) throw new Error('unique constraint');
      this.rows.set(String(localId), {
        local_id: localId,
        staff_user_id: staffUserId,
        device_id: deviceId,
        scanned_at: scannedAt,
        qr_payload_hash: qrPayloadHash,
        assignment_id: assignmentId,
        concert_id: concertId,
        gate,
        sync_status: 'pending',
        terminal_status: null,
        failure_reason: null,
        synced_at: null,
      });
      return { changes: 1 };
    }
    if (sql.includes("SET sync_status = 'synced'")) {
      const [syncedAt, staffUserId, localId] = params;
      this.updateOwned(String(staffUserId), String(localId), {
        sync_status: 'synced',
        synced_at: syncedAt,
        terminal_status: null,
        failure_reason: null,
      });
      return { changes: 1 };
    }
    if (sql.includes("SET sync_status = 'failed'")) {
      const [terminalStatus, failureReason, staffUserId, localId] = params;
      this.updateOwned(String(staffUserId), String(localId), {
        sync_status: 'failed',
        terminal_status: terminalStatus,
        failure_reason: failureReason,
      });
      return { changes: 1 };
    }
    if (sql.includes('DELETE FROM')) {
      const [staffUserId] = params;
      const status = sql.includes("'synced'") ? 'synced' : 'failed';
      for (const [id, row] of this.rows) {
        if (row.staff_user_id === staffUserId && row.sync_status === status) this.rows.delete(id);
      }
    }
    return { changes: 0 };
  }

  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const [staffUserId, limit] = params;
    const status = sql.includes("sync_status = 'failed'") ? 'failed' : 'pending';
    const rows = [...this.rows.values()]
      .filter((row) => row.staff_user_id === staffUserId && row.sync_status === status)
      .sort((left, right) => String(left.scanned_at).localeCompare(String(right.scanned_at)));
    if (sql.includes('COUNT(*)')) return [{ count: rows.length }] as T[];
    return rows.slice(0, typeof limit === 'number' ? limit : undefined) as T[];
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }

  private updateOwned(staffUserId: string, localId: string, values: Row): void {
    const row = this.rows.get(localId);
    if (row?.staff_user_id === staffUserId) Object.assign(row, values);
  }
}

const makeEvent = (localId: string, staffUserId = 'staff-1') => ({
  localId,
  staffUserId,
  deviceId: 'device-1',
  scannedAt: `2026-06-21T08:00:0${localId.slice(-1)}.000Z`,
  qrPayloadHash: 'a'.repeat(64),
  assignmentId: 'assignment-1',
  concertId: 'concert-1',
  gate: 'Main Gate',
});

describe('SqliteOfflineScanQueue', () => {
  it('migrates with WAL, schema version, unique identity, and owner/status index', async () => {
    const database = new FakeSqliteDatabase();
    await new SqliteOfflineScanQueue(database).initialize();
    expect(database.initializedSql).toContain('journal_mode = WAL');
    expect(database.initializedSql).toContain('local_id TEXT PRIMARY KEY');
    expect(database.initializedSql).toContain('staff_user_id, sync_status, scanned_at');
    expect(database.initializedSql).toContain('user_version = 1');
  });

  it('persists across reopen and keeps reads, counts, updates, and clearing account-scoped', async () => {
    const storage = new Map<string, Row>();
    const first = new SqliteOfflineScanQueue(new FakeSqliteDatabase(storage));
    await first.enqueue(makeEvent('local-1'));
    await first.enqueue(makeEvent('local-2', 'staff-2'));

    const reopened = new SqliteOfflineScanQueue(new FakeSqliteDatabase(storage));
    await expect(reopened.getPendingScanEvents('staff-1', 100)).resolves.toHaveLength(1);
    await expect(reopened.getPendingCount('staff-1')).resolves.toBe(1);
    await reopened.markFailed('staff-1', 'local-1', 'invalid', 'INVALID_TICKET');
    await expect(reopened.getFailedScanEvents('staff-1')).resolves.toEqual([
      expect.objectContaining({ terminalStatus: 'invalid', failureReason: 'INVALID_TICKET' }),
    ]);
    await expect(reopened.getPendingCount('staff-2')).resolves.toBe(1);
    await reopened.clearTerminalResults('staff-1');
    await expect(reopened.getFailedScanEvents('staff-1')).resolves.toEqual([]);
    await expect(reopened.getPendingCount('staff-2')).resolves.toBe(1);
  });

  it('enforces bounded pending reads and unique local IDs', async () => {
    const queue = new SqliteOfflineScanQueue(new FakeSqliteDatabase());
    for (let index = 0; index < 101; index += 1) await queue.enqueue(makeEvent(`local-${index}`));
    await expect(queue.getPendingScanEvents('staff-1', 1000)).resolves.toHaveLength(100);
    await expect(queue.enqueue(makeEvent('local-0'))).rejects.toThrow('unique constraint');
  });
});

describe('mobile QR hasher', () => {
  it('matches the backend UTF-8 lowercase SHA-256 convention', async () => {
    const hasher = createQrHasher(async (payload) =>
      createHash('sha256').update(payload, 'utf8').digest('hex').toUpperCase(),
    );
    await expect(hasher('ticketbox:opaque:payload')).resolves.toBe(
      createHash('sha256').update('ticketbox:opaque:payload', 'utf8').digest('hex'),
    );
  });
});
