import type {
  LoginRequest,
  OnlineScanRequest,
  OnlineScanResponse,
  StaffAssignment,
  StaffProfileResponse,
  BatchSyncRequest,
  BatchSyncResponse,
} from '@ticketbox/api-types';

export type StaffProfile = StaffProfileResponse;
export type { LoginRequest, OnlineScanRequest, StaffAssignment };
export type { BatchSyncRequest, BatchSyncResponse };

export interface MobileSession {
  readonly accessToken: string;
  readonly profile: StaffProfile;
}

export interface AuthApiClient {
  login(request: LoginRequest): Promise<MobileSession>;
}

export interface AssignmentApiClient {
  listStaffAssignments(accessToken: string): Promise<readonly StaffAssignment[]>;
}

export type MobileApiFailure =
  | {
      readonly status: 'unauthorized';
      readonly httpStatus: 401 | 403;
      readonly message: string;
    }
  | { readonly status: 'request-error'; readonly httpStatus: number; readonly message: string }
  | { readonly status: 'service-error'; readonly httpStatus: number; readonly message: string }
  | { readonly status: 'transport-error'; readonly message: string }
  | { readonly status: 'unknown-commit'; readonly message: string };

export type OnlineScanResult =
  | OnlineScanResponse
  | MobileApiFailure
  | { readonly status: 'queued'; readonly message: string; readonly localId: string };

export interface CheckinApiClient {
  submitOnlineScan(accessToken: string, request: OnlineScanRequest): Promise<OnlineScanResult>;
  submitBatchSync(accessToken: string, request: BatchSyncRequest): Promise<BatchSyncResponse>;
}

export interface CheckinMobileApiClient
  extends AuthApiClient, AssignmentApiClient, CheckinApiClient {}
