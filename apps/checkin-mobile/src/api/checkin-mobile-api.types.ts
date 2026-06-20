import type {
  LoginRequest,
  OnlineScanRequest,
  OnlineScanResponse,
  StaffAssignment,
  StaffProfileResponse,
} from '@ticketbox/api-types';

export type StaffProfile = StaffProfileResponse;
export type { LoginRequest, OnlineScanRequest, StaffAssignment };

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

export type OnlineScanResult =
  | OnlineScanResponse
  | { readonly status: 'unauthorized' | 'network-error' | 'unavailable'; readonly message: string };

export interface CheckinApiClient {
  submitOnlineScan(accessToken: string, request: OnlineScanRequest): Promise<OnlineScanResult>;
}

export interface CheckinMobileApiClient
  extends AuthApiClient, AssignmentApiClient, CheckinApiClient {}
