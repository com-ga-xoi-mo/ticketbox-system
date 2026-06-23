import type { BatchSyncResponse } from '@ticketbox/api-types';

import type { CheckinApiClient, MobileSession } from '../../api/checkin-mobile-api.types';
import {
  ApiRequestError,
  ApiResponseValidationError,
  ApiTransportError,
} from '../../api/http-checkin-mobile-api-client';
import type { NetworkMonitor } from './network-monitor.port';
import type { OfflineScanEvent, OfflineScanQueue } from './offline-scan-queue.port';

export interface SyncResultCounts {
  accepted: number;
  duplicate: number;
  invalid: number;
  conflict: number;
  unassigned: number;
}

export interface SyncServiceState {
  readonly status: 'idle' | 'syncing' | 'authentication-required' | 'forbidden' | 'error';
  readonly lastSyncAt?: string;
  readonly counts: SyncResultCounts;
  readonly message?: string;
}

type SessionProvider = () => MobileSession | null;

const emptyCounts = (): SyncResultCounts => ({
  accepted: 0,
  duplicate: 0,
  invalid: 0,
  conflict: 0,
  unassigned: 0,
});

export class SyncService {
  private activeRun: Promise<SyncServiceState> | null = null;
  private disposed = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryResolve: (() => void) | null = null;
  private currentState: SyncServiceState = { status: 'idle', counts: emptyCounts() };
  private readonly listeners = new Set<(state: SyncServiceState) => void>();
  private readonly unsubscribeNetwork: () => void;

  constructor(
    private readonly queue: OfflineScanQueue,
    private readonly api: CheckinApiClient,
    private readonly network: NetworkMonitor,
    private readonly sessionProvider: SessionProvider,
    private readonly random: () => number = Math.random,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.unsubscribeNetwork = network.onStatusChange((online) => {
      if (online) void this.triggerAuthenticatedSession();
    });
  }

  get state(): SyncServiceState {
    return this.currentState;
  }

  subscribe(listener: (state: SyncServiceState) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  triggerAuthenticatedSession(): Promise<SyncServiceState> {
    const session = this.sessionProvider();
    return session ? this.trigger(session) : Promise.resolve(this.currentState);
  }

  trigger(session: MobileSession): Promise<SyncServiceState> {
    if (this.activeRun) return this.activeRun;
    this.activeRun = this.run(session).finally(() => {
      this.activeRun = null;
    });
    return this.activeRun;
  }

  dispose(): void {
    this.disposed = true;
    this.unsubscribeNetwork();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.retryResolve?.();
    this.retryResolve = null;
    this.listeners.clear();
  }

  private async run(session: MobileSession): Promise<SyncServiceState> {
    const counts = emptyCounts();
    this.setState({ status: 'syncing', counts });
    let retry = 0;

    while (!this.disposed) {
      if (!this.network.isOnline()) {
        return this.setState({ status: 'idle', counts, message: 'Waiting for network' });
      }
      try {
        const pending = await this.queue.getPendingScanEvents(session.profile.id, 100);
        if (pending.length === 0) {
          return this.setState({ status: 'idle', counts, lastSyncAt: this.clock().toISOString() });
        }
        const response = await this.api.submitBatchSync(
          session.accessToken,
          pending.map(toBatchEvent),
        );
        await this.applyResponse(session.profile.id, pending, response, counts);
        retry = 0;
      } catch (error) {
        const classification = classifySyncFailure(error);
        if (classification === 'authentication-required') {
          return this.setState({
            status: 'authentication-required',
            counts,
            message: errorMessage(error),
          });
        }
        if (classification === 'forbidden') {
          return this.setState({ status: 'forbidden', counts, message: errorMessage(error) });
        }
        if (classification === 'error') {
          return this.setState({
            status: 'error',
            counts,
            message: error instanceof Error ? error.message : 'Internal synchronization error',
          });
        }
        // Clamp the jittered value (not just the pre-jitter base) so the
        // effective delay never exceeds the documented 30s maximum.
        const base = Math.min(30_000, 1_000 * 2 ** retry);
        const delay = Math.min(30_000, base * (0.5 + this.random()));
        retry += 1;
        await this.wait(delay);
      }
    }
    return this.currentState;
  }

  private async applyResponse(
    staffUserId: string,
    pending: OfflineScanEvent[],
    response: BatchSyncResponse,
    counts: SyncResultCounts,
  ): Promise<void> {
    const pendingIds = new Set(pending.map(({ localId }) => localId));
    const responseIds = new Set<string>();
    for (const result of response) {
      if (!pendingIds.has(result.localId) || responseIds.has(result.localId)) {
        throw new Error('Batch sync response correlation failed');
      }
      responseIds.add(result.localId);
    }
    if (responseIds.size !== pending.length) throw new Error('Batch sync response is incomplete');

    for (const result of response) {
      if (result.status === 'accepted' || result.status === 'duplicate') {
        await this.queue.markSynced(staffUserId, result.localId, this.clock().toISOString());
      } else {
        const reason =
          result.status === 'conflict' ? result.conflictReason : result.reasonCode;
        await this.queue.markFailed(staffUserId, result.localId, result.status, reason);
      }
      counts[result.status] += 1;
    }
  }

  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      this.retryResolve = resolve;
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        this.retryResolve = null;
        resolve();
      }, milliseconds);
    });
  }

  private setState(state: SyncServiceState): SyncServiceState {
    this.currentState = state;
    for (const listener of this.listeners) listener(state);
    return state;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Synchronization failed';
}

type SyncFailureClassification =
  | 'authentication-required'
  | 'forbidden'
  | 'retryable'
  | 'error';

function classifySyncFailure(error: unknown): SyncFailureClassification {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return 'authentication-required';
    if (error.status === 403) return 'forbidden';
    return error.status >= 500 ? 'retryable' : 'error';
  }
  if (error instanceof ApiTransportError || error instanceof ApiResponseValidationError) {
    return 'retryable';
  }
  return 'error';
}

function toBatchEvent(event: OfflineScanEvent) {
  return {
    localId: event.localId,
    assignmentId: event.assignmentId,
    concertId: event.concertId,
    ...(event.gate ? { gate: event.gate } : {}),
    qrPayloadHash: event.qrPayloadHash,
    scannedAt: event.scannedAt,
    deviceId: event.deviceId,
  };
}
