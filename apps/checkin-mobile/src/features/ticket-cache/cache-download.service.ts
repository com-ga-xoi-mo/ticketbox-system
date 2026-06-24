import type { MobileSession, StaffAssignment, TicketCacheApiClient } from '../../api/checkin-mobile-api.types';
import type { TicketCacheRepository } from './ticket-cache.repository';

export type CacheDownloadStatus = 'idle' | 'downloading' | 'ready' | 'unavailable';

export class CacheDownloadService {
  private _status: CacheDownloadStatus = 'idle';
  private _lastCacheSyncAt: string | null = null;
  private _lastConcertId: string | null = null;
  private _hasData = false;
  private _inFlight: Promise<void> | null = null;

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

  /**
   * Refresh the local ticket cache. The first load for a concert (or when no sync
   * timestamp exists yet) is a full download; subsequent refreshes pass `since` and
   * apply only the server delta. Single-flight: concurrent calls join the active
   * refresh. Failures are non-destructive — the existing cache is preserved.
   */
  download(assignment: StaffAssignment, session: MobileSession): Promise<void> {
    if (this._inFlight) {
      return this._inFlight;
    }
    this._inFlight = this.run(assignment, session).finally(() => {
      this._inFlight = null;
    });
    return this._inFlight;
  }

  private async run(assignment: StaffAssignment, session: MobileSession): Promise<void> {
    const sameConcert = this._lastConcertId === assignment.concertId;
    const since = sameConcert ? this._lastCacheSyncAt ?? undefined : undefined;

    this._status = 'downloading';
    try {
      const response = await this.api.fetchTicketCache(session.accessToken, {
        assignmentId: assignment.assignmentId,
        concertId: assignment.concertId,
        ...(since ? { since } : {}),
      });

      if ('entries' in response) {
        await this.repository.replaceAll(
          session.profile.id,
          assignment.concertId,
          response.entries,
          response.syncedAt,
        );
      } else {
        await this.repository.applyDelta(
          session.profile.id,
          assignment.concertId,
          response,
          response.syncedAt,
        );
      }

      this._lastCacheSyncAt = response.syncedAt;
      this._lastConcertId = assignment.concertId;
      this._hasData = true;
      this._status = 'ready';
    } catch {
      // Preserve any cache we already have; only report unavailable when we have none.
      this._status = this._hasData ? 'ready' : 'unavailable';
    }
  }
}
