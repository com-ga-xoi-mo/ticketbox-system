import type { TicketCacheDeltaResponse } from '@ticketbox/api-types';

import type { SqliteDatabase } from '../offline-queue/sqlite-database.port';

export type CacheEntryStatus = 'valid' | 'checked_in';

interface CacheRow {
  qr_token_hash: string;
  status: CacheEntryStatus;
}

export class TicketCacheRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async replaceAll(
    staffUserId: string,
    concertId: string,
    entries: Array<{ hash: string; status: CacheEntryStatus }>,
    cachedAt: string,
  ): Promise<void> {
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        'DELETE FROM ticket_cache WHERE staff_user_id = ? AND concert_id = ?',
        staffUserId,
        concertId,
      );
      for (const entry of entries) {
        await this.database.runAsync(
          'INSERT OR REPLACE INTO ticket_cache (qr_token_hash, staff_user_id, concert_id, status, cached_at) VALUES (?, ?, ?, ?, ?)',
          entry.hash,
          staffUserId,
          concertId,
          entry.status,
          cachedAt,
        );
      }
    });
  }

  async applyDelta(
    staffUserId: string,
    concertId: string,
    delta: Pick<TicketCacheDeltaResponse, 'upserted' | 'voided'>,
    cachedAt: string,
  ): Promise<void> {
    await this.database.withTransactionAsync(async () => {
      for (const entry of delta.upserted) {
        await this.database.runAsync(
          'INSERT OR REPLACE INTO ticket_cache (qr_token_hash, staff_user_id, concert_id, status, cached_at) VALUES (?, ?, ?, ?, ?)',
          entry.hash,
          staffUserId,
          concertId,
          entry.status,
          cachedAt,
        );
      }
      for (const hash of delta.voided) {
        await this.database.runAsync(
          'DELETE FROM ticket_cache WHERE qr_token_hash = ? AND staff_user_id = ? AND concert_id = ?',
          hash,
          staffUserId,
          concertId,
        );
      }
    });
  }

  async lookup(
    staffUserId: string,
    concertId: string,
    hash: string,
  ): Promise<CacheEntryStatus | null> {
    const rows = await this.database.getAllAsync<CacheRow>(
      'SELECT status FROM ticket_cache WHERE qr_token_hash = ? AND staff_user_id = ? AND concert_id = ?',
      hash,
      staffUserId,
      concertId,
    );
    return rows[0]?.status ?? null;
  }

  async markCheckedIn(staffUserId: string, concertId: string, hash: string): Promise<void> {
    await this.database.runAsync(
      'UPDATE ticket_cache SET status = ? WHERE qr_token_hash = ? AND staff_user_id = ? AND concert_id = ?',
      'checked_in',
      hash,
      staffUserId,
      concertId,
    );
  }

  async clearForStaff(staffUserId: string): Promise<void> {
    await this.database.runAsync(
      'DELETE FROM ticket_cache WHERE staff_user_id = ?',
      staffUserId,
    );
  }

  async hasCache(staffUserId: string, concertId: string): Promise<boolean> {
    const rows = await this.database.getAllAsync<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM ticket_cache WHERE staff_user_id = ? AND concert_id = ?',
      staffUserId,
      concertId,
    );
    return (rows[0]?.cnt ?? 0) > 0;
  }
}
