import type { Role } from './jwt-decode';
import type { Session } from './AuthContext';

export function canAccess(session: Session | null, allowedRoles: Role[]): boolean {
  if (!session) return false;
  return session.roles.some((r) => allowedRoles.includes(r));
}

export function redirectFor(session: Session | null): string {
  if (!session) return '/login';
  if (session.roles.includes('ADMIN')) return '/admin/dashboard';
  if (session.roles.includes('ORGANIZER')) return '/organizer/concerts';
  return '/no-access';
}
