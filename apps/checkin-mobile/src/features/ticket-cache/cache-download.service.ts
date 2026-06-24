import type { MobileSession, StaffAssignment, TicketCacheApiClient } from '../../api/checkin-mobile-api.types';
import type { TicketCacheRepository } from './ticket-cache.repository';

export type CacheDownloadStatus = 'idle' | 'downloading' | 'ready' | 'unavailable';

export class CacheDownloadService {
  private _status: CacheDownloadStatus = 'idle';
  private _lastCacheSyncAt: string | null = null;

  constructor(
    private readonly api: TicketCacheApiClient,
    private readonly repository: TicketCacheRepository,
  ) {}

  get status(): CacheDownloadStatus {
    return this._status;
  }

  get lastCacheSyncAt(): string | null {
    return this._lastCacheSyncAt;
  }

  async download(assignment: StaffAssignment, session: MobileSession): Promise<void> {
    this._status = 'downloading';
    try {
      const syncedAt = new Date().toISOString();
      const response = await this.api.fetchTicketCache(session.accessToken, {
        assignmentId: assignment.assignmentId,
        concertId: assignment.concertId,
      });

      if ('entries' in response) {
        await this.repository.replaceAll(
          session.profile.id,
          assignment.concertId,
          response.entries,
          syncedAt,
        );
      } else {
        await this.repository.applyDelta(
          session.profile.id,
          assignment.concertId,
          response,
          syncedAt,
        );
      }

      this._lastCacheSyncAt = response.syncedAt;
      this._status = 'ready';
    } catch {
      this._status = 'unavailable';
    }
  }
}
