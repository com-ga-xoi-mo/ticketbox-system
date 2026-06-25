import { get, post } from '../../../shared/api/client';
import { getToken } from '../../../shared/auth/token-storage';
import { UserRole, UserStatus } from '../accounts/api';

export interface StaffAssignment {
  id: string; // just in case
  userId: string;
  concertId: string;
  gateName: string | null;
  assignedAt: string;
  revokedAt: string | null;
  user?: {
    id: string;
    email: string;
    displayName: string;
    status: UserStatus;
    roles: UserRole[];
  };
}

export async function getAssignments(concertId: string): Promise<StaffAssignment[]> {
  return get<StaffAssignment[]>(`/admin/concerts/${concertId}/staff`);
}

export interface AssignStaffPayload {
  userId: string;
  gateName?: string;
}

export async function assignStaff(concertId: string, payload: AssignStaffPayload): Promise<StaffAssignment> {
  return post<StaffAssignment>(`/admin/concerts/${concertId}/staff`, {
    staffUserId: payload.userId,
    gateName: payload.gateName,
  });
}

export interface BulkCreateStaffPayload {
  baseEmail: string;
  quantity: number;
  displayNamePrefix: string;
}

export interface BulkCreatedStaffCredential {
  userId: string;
  displayName: string;
  email: string;
  password: string;
  assignmentId: string;
  concertId: string;
  concertTitle: string;
}

export interface BulkCreateStaffResponse {
  concertId: string;
  concertTitle: string;
  credentials: BulkCreatedStaffCredential[];
}

export async function bulkCreateStaff(
  concertId: string,
  payload: BulkCreateStaffPayload,
): Promise<BulkCreateStaffResponse> {
  return post<BulkCreateStaffResponse>(`/admin/concerts/${concertId}/staff/bulk-create`, payload);
}

export async function revokeAssignment(concertId: string, assignmentId: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'}/admin/concerts/${concertId}/staff/${assignmentId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to revoke assignment: ${res.status}`);
  }
}
