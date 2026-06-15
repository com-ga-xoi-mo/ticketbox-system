import type { JwtPayload } from '../jwt-payload.interface';

export const TOKEN_ISSUER = Symbol('TokenIssuerPort');

export interface TokenIssuerPort {
  issue(payload: JwtPayload): string;
}
