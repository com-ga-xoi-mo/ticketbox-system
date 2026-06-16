export type StaffRole = 'AUDIENCE' | 'ORGANIZER' | 'CHECKIN_STAFF' | 'ADMIN';

export interface StaffProfile {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly roles: readonly StaffRole[];
}

export interface MobileSession {
  readonly accessToken: string;
  readonly profile: StaffProfile;
}

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface AuthApiClient {
  login(request: LoginRequest): Promise<MobileSession>;
}

export type StaffAssignmentStatus = 'ACTIVE' | 'REVOKED';

export interface StaffAssignment {
  readonly assignmentId: string;
  readonly concertId: string;
  readonly concertTitle: string;
  readonly gate?: string;
  readonly startsAt?: string;
  readonly status: StaffAssignmentStatus;
}

export interface AssignmentApiClient {
  listStaffAssignments(accessToken: string): Promise<readonly StaffAssignment[]>;
}

export interface OnlineScanRequest {
  readonly assignmentId: string;
  readonly concertId: string;
  readonly gate?: string;
  readonly qrPayload: string;
  readonly scannedAt: string;
  readonly deviceId: string;
}

export type OnlineScanResultStatus =
  | 'accepted'
  | 'duplicate'
  | 'invalid'
  | 'unauthorized'
  | 'unassigned'
  | 'network-error'
  | 'unavailable';

export interface OnlineScanResult {
  readonly status: OnlineScanResultStatus;
  readonly message: string;
  readonly ticketId?: string;
  readonly checkedInAt?: string;
}

export interface CheckinApiClient {
  submitOnlineScan(accessToken: string, request: OnlineScanRequest): Promise<OnlineScanResult>;
}

export interface CheckinMobileApiClient extends AuthApiClient, AssignmentApiClient, CheckinApiClient {}
