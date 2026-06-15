/**
 * Port (interface) for user persistence operations required by the Identity
 * bounded context.
 *
 * The application use-cases depend only on this interface — they have no
 * knowledge of the underlying ORM, SQL dialect, or any other infrastructure
 * detail. The concrete implementation lives in infrastructure/database/.
 */

// ---------------------------------------------------------------------------
// Data shapes used across the port boundary
// ---------------------------------------------------------------------------

export interface CreateUserData {
  email: string;
  passwordHash: string;
  displayName: string;
}

/**
 * A minimal projection of a user returned by repository operations.
 * Role codes are plain strings so the domain stays free of Prisma types.
 */
export interface UserRecord {
  id: string;
  email: string;
  /** bcrypt hash — only needed by LoginUseCase for comparison */
  passwordHash: string;
  /** Array of role code strings, e.g. ['AUDIENCE'] */
  roles: string[];
}

// ---------------------------------------------------------------------------
// DI injection token (avoids magic strings)
// ---------------------------------------------------------------------------

export const USER_REPOSITORY = Symbol('IUserRepository');

// ---------------------------------------------------------------------------
// Port interface
// ---------------------------------------------------------------------------

export interface IUserRepository {
  /**
   * Persist a new user and assign the AUDIENCE role atomically.
   * Throws EmailAlreadyRegisteredError if the email is already registered.
   */
  createWithAudienceRole(data: CreateUserData): Promise<UserRecord>;

  /**
   * Find a user by email address, returning null when not found.
   */
  findByEmail(email: string): Promise<UserRecord | null>;
}
