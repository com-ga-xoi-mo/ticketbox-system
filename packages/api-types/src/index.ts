export {
  LoginRequestSchema,
  LoginResponseSchema,
  ROLE_CODES,
  RoleCodeSchema,
  StaffProfileResponseSchema,
} from './auth/auth.contract';
export type {
  LoginRequest,
  LoginResponse,
  RoleCode,
  StaffProfileResponse,
} from './auth/auth.contract';

export {
  StaffAssignmentSchema,
  StaffAssignmentsResponseSchema,
} from './checkin/assignment.contract';
export type { StaffAssignment, StaffAssignmentsResponse } from './checkin/assignment.contract';

export {
  INVALID_SCAN_REASON_CODES,
  InvalidScanReasonCodeSchema,
  OnlineScanRequestSchema,
  OnlineScanResponseSchema,
  UNASSIGNED_SCAN_REASON_CODES,
  UnassignedScanReasonCodeSchema,
} from './checkin/online-scan.contract';

export {
  VipLookupRequestSchema,
  VipLookupResponseSchema,
  VipLookupTypeSchema,
} from './checkin/vip-lookup.contract';
export type {
  VipLookupRequest,
  VipLookupResponse,
  VipLookupType,
} from './checkin/vip-lookup.contract';
export type {
  InvalidScanReasonCode,
  OnlineScanRequest,
  OnlineScanResponse,
  UnassignedScanReasonCode,
} from './checkin/online-scan.contract';
