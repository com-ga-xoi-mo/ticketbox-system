import type { Role } from './role.enum';

/**
 * Represents the authenticated principal attached to `request.user`
 * after a successful JWT verification.
 *
 * Lives in the domain layer so every other layer can reference it
 * without importing from infrastructure (passport strategy).
 */
export interface AuthenticatedUser {
  id: string;
  roles: Role[];
}
