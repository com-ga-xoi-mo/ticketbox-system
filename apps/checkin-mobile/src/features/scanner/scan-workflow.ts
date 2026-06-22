import type {
  CheckinApiClient,
  MobileSession,
  OnlineScanRequest,
  OnlineScanResult,
  StaffAssignment,
} from '../../api/checkin-mobile-api.types';
import type { OfflineScanQueue } from '../offline-queue/offline-scan-queue.port';
import type { NetworkMonitor } from '../offline-queue/network-monitor.port';
import type { QrHasher } from '../offline-queue/qr-hasher';
import type { LocalIdProvider } from '../offline-queue/local-id-provider';

export type ScanWorkflowState =
  | { readonly status: 'initializing' }
  | { readonly status: 'ready' }
  | { readonly status: 'submitting'; readonly request: OnlineScanRequest }
  | { readonly status: 'result'; readonly result: OnlineScanResult }
  | { readonly status: 'recoverable-error'; readonly message: string };

export type DeviceIdProvider = () => Promise<string>;
export type Clock = () => Date;

export class ScanWorkflow {
  private currentState: ScanWorkflowState = { status: 'initializing' };
  private deviceId: string | null = null;
  private online = true;
  private readonly unsubscribeNetwork?: () => void;

  constructor(
    private readonly checkinApi: CheckinApiClient,
    private readonly deviceIdProvider: DeviceIdProvider,
    private readonly clock: Clock = () => new Date(),
    private readonly offlineQueue?: OfflineScanQueue,
    private readonly networkMonitor?: NetworkMonitor,
    private readonly qrHasher?: QrHasher,
    private readonly localIdProvider?: LocalIdProvider,
  ) {
    this.online = networkMonitor?.isOnline() ?? true;
    this.unsubscribeNetwork = networkMonitor?.onStatusChange((online) => {
      this.online = online;
    });
  }

  get state(): ScanWorkflowState {
    return this.currentState;
  }

  get mode(): 'online' | 'offline' {
    return this.online ? 'online' : 'offline';
  }

  dispose(): void {
    this.unsubscribeNetwork?.();
  }

  async initialize(): Promise<ScanWorkflowState> {
    this.currentState = { status: 'initializing' };
    try {
      this.deviceId = await this.deviceIdProvider();
      this.currentState = { status: 'ready' };
    } catch (error) {
      this.currentState = {
        status: 'recoverable-error',
        message: error instanceof Error ? error.message : 'Unable to initialize this installation',
      };
    }
    return this.currentState;
  }

  reset(): ScanWorkflowState {
    this.currentState = this.deviceId
      ? { status: 'ready' }
      : { status: 'recoverable-error', message: 'Installation identifier is unavailable' };
    return this.currentState;
  }

  async submitDecodedPayload(
    qrPayload: string,
    assignment: StaffAssignment,
    session: MobileSession,
  ): Promise<ScanWorkflowState> {
    if (this.currentState.status !== 'ready' || !this.deviceId) {
      return this.currentState;
    }

    const request: OnlineScanRequest = {
      assignmentId: assignment.assignmentId,
      concertId: assignment.concertId,
      gate: assignment.gate,
      qrPayload,
      scannedAt: this.clock().toISOString(),
      deviceId: this.deviceId,
    };

    this.currentState = { status: 'submitting', request };

    if (!this.online && this.offlineQueue && this.qrHasher && this.localIdProvider) {
      return this.enqueue(qrPayload, assignment, session, request.scannedAt);
    }

    try {
      const result = await this.checkinApi.submitOnlineScan(session.accessToken, request);
      if (
        isRetryableScanFailure(result) &&
        this.offlineQueue &&
        this.qrHasher &&
        this.localIdProvider
      ) {
        return this.enqueue(qrPayload, assignment, session, request.scannedAt);
      }
      this.currentState = { status: 'result', result };
      return this.currentState;
    } catch (error) {
      this.currentState = {
        status: 'recoverable-error',
        message: error instanceof Error ? error.message : 'Unexpected scan submission failure',
      };
      return this.currentState;
    }
  }

  private async enqueue(
    qrPayload: string,
    assignment: StaffAssignment,
    session: MobileSession,
    scannedAt: string,
  ): Promise<ScanWorkflowState> {
    if (!this.deviceId || !this.offlineQueue || !this.qrHasher || !this.localIdProvider) {
      // Never leave the workflow stuck in `submitting` when a required offline
      // dependency is absent; surface a recoverable error instead.
      this.currentState = {
        status: 'recoverable-error',
        message: 'Offline queue is not available on this installation.',
      };
      return this.currentState;
    }
    try {
      const localId = this.localIdProvider();
      const qrPayloadHash = await this.qrHasher(qrPayload);
      await this.offlineQueue.enqueue({
        localId,
        staffUserId: session.profile.id,
        deviceId: this.deviceId,
        scannedAt,
        qrPayloadHash,
        assignmentId: assignment.assignmentId,
        concertId: assignment.concertId,
        ...(assignment.gate ? { gate: assignment.gate } : {}),
      });
      this.currentState = {
        status: 'result',
        result: { status: 'queued', localId, message: 'Scan queued for synchronization.' },
      };
    } catch (error) {
      this.currentState = {
        status: 'recoverable-error',
        message: error instanceof Error ? error.message : 'Unable to queue scan',
      };
    }
    return this.currentState;
  }
}

function isRetryableScanFailure(result: OnlineScanResult): boolean {
  return (
    result.status === 'transport-error' ||
    result.status === 'service-error' ||
    result.status === 'unknown-commit'
  );
}
