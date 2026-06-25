import type { Role } from './role.enum';

export interface JwtPayload {
  sub: string;
  roles: Role[];
  iat?: number;
  exp?: number;
}
