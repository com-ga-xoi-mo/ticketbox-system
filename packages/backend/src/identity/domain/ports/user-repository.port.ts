import type { UserStatus } from '../user-status.enum';

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

export interface UpdateUserProfileData {
  displayName?: string;
  email?: string;
}

export interface UserFilter {
  role?: string;
  status?: string;
  unassigned?: boolean;
}

/**
 * A minimal projection of a user returned by repository operations.
 * Role codes are plain strings so the domain stays free of Prisma types.
 */
export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  /** Array of role code strings, e.g. ['AUDIENCE'] */
  roles: string[];
}

/**
 * Extended projection that includes the password hash.
 * Only used for authentication scenarios to prevent accidental leakage.
 */
export interface UserRecordWithPassword extends UserRecord {
  passwordHash: string;
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
   * Persist a new user and assign an arbitrary set of roles atomically.
   * Used by staff account provisioning.
   * Throws EmailAlreadyRegisteredError if the email is already registered.
   */
  createWithRoles(data: CreateUserData, roles: string[]): Promise<UserRecord>;

  /**
   * Find a user by ID.
   */
  findById(id: string): Promise<UserRecord | null>;

  /**
   * Find a user by email address, returning null when not found.
   */
  findByEmail(email: string): Promise<UserRecordWithPassword | null>;

  /**
   * List users optionally filtered by role and/or status.
   */
  listUsers(filter?: UserFilter): Promise<UserRecord[]>;

  /**
   * Update a user's profile details.
   */
  updateProfile(id: string, data: UpdateUserProfileData): Promise<UserRecord>;

  /**
   * Update a user's status.
   */
  setStatus(id: string, status: UserStatus): Promise<UserRecord>;

  /**
   * Update a user's roles.
   */
  setRoles(id: string, roles: string[]): Promise<UserRecord>;
}
