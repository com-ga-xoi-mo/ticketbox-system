import { beforeEach, describe, expect, it } from 'vitest';

import type { SqliteDatabase, SqliteRunResult } from '../offline-queue/sqlite-database.port';
import { TicketCacheRepository } from './ticket-cache.repository';

type Row = Record<string, unknown>;

class FakeSqliteDatabase implements SqliteDatabase {
  readonly rows = new Map<string, Row>();

  async execAsync(_sql: string): Promise<void> { void _sql; }

  async runAsync(sql: string, ...params: unknown[]): Promise<SqliteRunResult> {
    const s = sql.trim().toUpperCase();
    if (s.startsWith('INSERT OR REPLACE')) {
      const [hash, staffUserId, concertId, status, cachedAt] = params;
      const key = `${String(hash)}:${String(staffUserId)}`;
      this.rows.set(key, { qr_token_hash: hash, staff_user_id: staffUserId, concert_id: concertId, status, cached_at: cachedAt });
      return { changes: 1 };
    }
    if (s.startsWith('DELETE FROM TICKET_CACHE WHERE QR_TOKEN_HASH')) {
      const [hash, staffUserId, concertId] = params;
      const key = `${String(hash)}:${String(staffUserId)}`;
      if (this.rows.get(key)?.concert_id === concertId) {
        this.rows.delete(key);
        return { changes: 1 };
      }
      return { changes: 0 };
    }
    if (s.startsWith('DELETE FROM TICKET_CACHE WHERE STAFF_USER_ID')) {
      const [staffUserId] = params;
      for (const [k, v] of this.rows) {
        if (v.staff_user_id === staffUserId) this.rows.delete(k);
      }
      return { changes: 0 };
    }
    if (s.startsWith('UPDATE TICKET_CACHE')) {
      const [newStatus, hash, staffUserId] = params;
      const key = `${String(hash)}:${String(staffUserId)}`;
      const row = this.rows.get(key);
      if (row) row.status = newStatus;
      return { changes: row ? 1 : 0 };
    }
    return { changes: 0 };
  }

  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const s = sql.trim().toUpperCase();
    if (s.startsWith('SELECT STATUS')) {
      const [hash, staffUserId, concertId] = params;
      const key = `${String(hash)}:${String(staffUserId)}`;
      const row = this.rows.get(key);
      if (row && row.concert_id === concertId) return [{ status: row.status }] as T[];
      return [];
    }
    if (s.startsWith('SELECT COUNT(*)')) {
      const [staffUserId, concertId] = params;
      const cnt = [...this.rows.values()].filter(
        (r) => r.staff_user_id === staffUserId && r.concert_id === concertId,
      ).length;
      return [{ cnt }] as T[];
    }
    return [];
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }
}

const staffUserId = 'staff-1';
const concertId = 'concert-1';
const hash = 'a'.repeat(64);
const now = new Date().toISOString();

describe('TicketCacheRepository', () => {
  let db: FakeSqliteDatabase;
  let repo: TicketCacheRepository;

  beforeEach(() => {
    db = new FakeSqliteDatabase();
    repo = new TicketCacheRepository(db);
  });

  it('replaces all entries for a concert', async () => {
    await repo.replaceAll(staffUserId, concertId, [{ hash, status: 'valid' }], now);
    expect(await repo.lookup(staffUserId, concertId, hash)).toBe('valid');
  });

  it('lookup returns null for missing hash', async () => {
    expect(await repo.lookup(staffUserId, concertId, hash)).toBeNull();
  });

  it('lookup returns null for wrong concert', async () => {
    await repo.replaceAll(staffUserId, concertId, [{ hash, status: 'valid' }], now);
    expect(await repo.lookup(staffUserId, 'other-concert', hash)).toBeNull();
  });

  it('applyDelta upserts and removes voided entries', async () => {
    const hash2 = 'b'.repeat(64);
    await repo.replaceAll(staffUserId, concertId, [{ hash, status: 'valid' }, { hash: hash2, status: 'valid' }], now);
    await repo.applyDelta(staffUserId, concertId, { upserted: [{ hash, status: 'checked_in' }], voided: [hash2] }, now);
    expect(await repo.lookup(staffUserId, concertId, hash)).toBe('checked_in');
    expect(await repo.lookup(staffUserId, concertId, hash2)).toBeNull();
  });

  it('markCheckedIn updates status', async () => {
    await repo.replaceAll(staffUserId, concertId, [{ hash, status: 'valid' }], now);
    await repo.markCheckedIn(staffUserId, concertId, hash);
    expect(await repo.lookup(staffUserId, concertId, hash)).toBe('checked_in');
  });

  it('clearForStaff removes all entries for the staff user', async () => {
    await repo.replaceAll(staffUserId, concertId, [{ hash, status: 'valid' }], now);
    await repo.clearForStaff(staffUserId);
    expect(await repo.hasCache(staffUserId, concertId)).toBe(false);
  });

  it('hasCache returns true when entries exist', async () => {
    expect(await repo.hasCache(staffUserId, concertId)).toBe(false);
    await repo.replaceAll(staffUserId, concertId, [{ hash, status: 'valid' }], now);
    expect(await repo.hasCache(staffUserId, concertId)).toBe(true);
  });
});
