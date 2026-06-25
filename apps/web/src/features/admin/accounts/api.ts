import { get, post, patch } from '../../../shared/api/client';

export type UserRole = 'ADMIN' | 'ORGANIZER' | 'CHECKIN_STAFF' | 'AUDIENCE';
export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface AdminAccount {
  id: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  status: UserStatus;
  createdAt: string;
}

export type AdminAccountListResponse = AdminAccount[];

export interface CreateAccountPayload {
  email: string;
  passwordRaw: string;
  displayName: string;
  roles: UserRole[];
}

export interface UpdateAccountPayload {
  displayName: string;
  email?: string;
  roles: UserRole[];
}

export interface UpdateAccountStatusPayload {
  status: UserStatus;
}

const BASE = '/admin/users';

export async function getAccounts(role?: string, status?: string, unassigned?: boolean): Promise<AdminAccountListResponse> {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  if (status) params.append('status', status);
  if (unassigned) params.append('unassigned', 'true');
  const query = params.toString();
  return get<AdminAccountListResponse>(query ? `${BASE}?${query}` : BASE);
}

export async function getAccount(id: string): Promise<AdminAccount> {
  return get<AdminAccount>(`${BASE}/${id}`);
}

export async function createAccount(payload: CreateAccountPayload): Promise<AdminAccount> {
  return post<AdminAccount>(BASE, payload);
}

export async function updateAccount(id: string, payload: UpdateAccountPayload): Promise<AdminAccount> {
  return patch<AdminAccount>(`${BASE}/${id}`, payload);
}

export async function updateAccountStatus(id: string, payload: UpdateAccountStatusPayload): Promise<AdminAccount> {
  return patch<AdminAccount>(`${BASE}/${id}/status`, payload);
}
