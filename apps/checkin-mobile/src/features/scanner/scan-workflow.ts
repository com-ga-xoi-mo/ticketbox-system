import type {
  CheckinApiClient,
  MobileSession,
  OnlineScanRequest,
  OnlineScanResult,
  StaffAssignment,
} from '../../api/checkin-mobile-api.types';

export type ScanWorkflowState =
  | { readonly status: 'ready' }
  | { readonly status: 'submitting'; readonly request: OnlineScanRequest }
  | { readonly status: 'result'; readonly result: OnlineScanResult }
  | { readonly status: 'recoverable-error'; readonly message: string };

export type DeviceIdProvider = () => string;
export type Clock = () => Date;

export class ScanWorkflow {
  private currentState: ScanWorkflowState = { status: 'ready' };

  constructor(
    private readonly checkinApi: CheckinApiClient,
    private readonly deviceIdProvider: DeviceIdProvider,
    private readonly clock: Clock = () => new Date(),
  ) {}

  get state(): ScanWorkflowState {
    return this.currentState;
  }

  reset(): ScanWorkflowState {
    this.currentState = { status: 'ready' };
    return this.currentState;
  }

  async submitDecodedPayload(
    qrPayload: string,
    assignment: StaffAssignment,
    session: MobileSession,
  ): Promise<ScanWorkflowState> {
    if (this.currentState.status === 'submitting') {
      return this.currentState;
    }

    const request: OnlineScanRequest = {
      assignmentId: assignment.assignmentId,
      concertId: assignment.concertId,
      gate: assignment.gate,
      qrPayload,
      scannedAt: this.clock().toISOString(),
      deviceId: this.deviceIdProvider(),
    };

    this.currentState = { status: 'submitting', request };

    try {
      const result = await this.checkinApi.submitOnlineScan(session.accessToken, request);
      this.currentState = { status: 'result', result };
      return this.currentState;
    } catch (error) {
      this.currentState = {
        status: 'result',
        result: {
          status: 'network-error',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
      return this.currentState;
    }
  }
}
