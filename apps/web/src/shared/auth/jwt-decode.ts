export type Role = 'AUDIENCE' | 'ORGANIZER' | 'CHECKIN_STAFF' | 'ADMIN';

export interface JwtPayload {
  sub: string;
  roles: Role[];
}

export function decodeJwt(token: string | null): JwtPayload | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.sub !== 'string' || !Array.isArray(payload.roles)) return null;
    return { sub: payload.sub as string, roles: payload.roles as Role[] };
  } catch {
    return null;
  }
}
