## ADDED Requirements

### Requirement: JWT-based session for protected actions
The system SHALL use stateless JWT access tokens (not server-side sessions) to maintain an authenticated session for protected actions. Tokens SHALL be included in requests as `Authorization: Bearer <token>` headers, and authenticated profile responses SHALL follow the shared public profile contract while preserving the current verified-JWT authorization snapshot.

#### Scenario: Authenticated user accesses own profile
- **WHEN** an authenticated user sends `GET /me/profile` with a valid JWT
- **THEN** the system SHALL return `id` and public `RoleCode` values from the verified JWT principal together with `email` and `displayName` from a safe profile projection, without exposing password, repository, or persistence data

#### Scenario: Profile enrichment does not reauthorize roles
- **WHEN** the authenticated user's persisted role relations differ from the roles in the already verified JWT
- **THEN** `GET /me/profile` SHALL use the JWT principal roles for the response and SHALL NOT reload, replace, merge, or compare them with database roles during this change

#### Scenario: New user defaults to AUDIENCE role on registration
- **WHEN** a user successfully registers via `POST /auth/register`
- **THEN** the system SHALL assign the `AUDIENCE` role to the user and include it in the returned JWT

### Requirement: Admin route authorization
The system SHALL restrict platform-admin backend actions to authenticated users with the `ADMIN` role. Internal admin web routes for organizer-owned concert management SHALL use organizer ownership authorization instead of requiring `ADMIN` only.

#### Scenario: Admin accesses admin-only action
- **WHEN** an authenticated user with the `ADMIN` role calls an admin-only backend action
- **THEN** the system SHALL allow the action to proceed

#### Scenario: Organizer is denied admin-only action
- **WHEN** an authenticated user with only the `ORGANIZER` role calls an admin-only backend action
- **THEN** the system SHALL reject the request with an authorization error

#### Scenario: Organizer can access owned concert admin action
- **WHEN** an authenticated organizer calls an internal admin web action for a concert they own
- **THEN** the system SHALL evaluate organizer ownership authorization instead of requiring the `ADMIN` role

### Requirement: Organizer concert ownership authorization
The system SHALL authorize organizer concert management actions only when the authenticated organizer owns the target concert, unless an explicitly admin-authorized action is being performed.

#### Scenario: Organizer manages owned concert
- **WHEN** an authenticated organizer requests a management action for a concert whose `createdById` matches their user ID
- **THEN** the system SHALL authorize the action

#### Scenario: Organizer is denied for another organizer's concert
- **WHEN** an authenticated organizer requests a management action for a concert whose `createdById` does not match their user ID
- **THEN** the system SHALL reject the action with an authorization error

#### Scenario: Admin override is allowed for concert management
- **WHEN** an authenticated admin requests a concert management action through a route that explicitly allows admin override
- **THEN** the system SHALL authorize the action even when the admin is not the concert creator

### Requirement: Check-in staff assignment authorization
The system SHALL authorize check-in staff actions only for authenticated `CHECKIN_STAFF` users who have an active assignment for the relevant concert and, when required, gate.

#### Scenario: Assigned staff is authorized for concert check-in
- **WHEN** an authenticated check-in staff user has an active assignment for the target concert
- **THEN** the system SHALL authorize check-in actions for that concert

#### Scenario: Unassigned staff is denied for concert check-in
- **WHEN** an authenticated check-in staff user has no active assignment for the target concert
- **THEN** the system SHALL reject check-in actions for that concert

#### Scenario: Revoked assignment is denied
- **WHEN** an authenticated check-in staff user has only a revoked assignment for the target concert
- **THEN** the system SHALL reject check-in actions for that concert

#### Scenario: Gate-specific assignment is enforced
- **WHEN** a check-in action requires a gate and the staff user's active assignment is for a different gate
- **THEN** the system SHALL reject the check-in action for the requested gate

### Requirement: Check-in staff assignment management authorization
The system SHALL allow organizers to manage check-in staff assignments for concerts they own and admins to manage check-in staff assignments for any concert.

#### Scenario: Organizer assigns staff for owned concert
- **WHEN** an authenticated organizer assigns a check-in staff user to a concert they own
- **THEN** the system SHALL create an active assignment for that concert or gate

#### Scenario: Organizer cannot assign staff for another organizer's concert
- **WHEN** an authenticated organizer assigns check-in staff to a concert they do not own
- **THEN** the system SHALL reject the assignment action with an authorization error

#### Scenario: Admin assigns staff for any concert
- **WHEN** an authenticated admin assigns a check-in staff user to any concert
- **THEN** the system SHALL create an active assignment for that concert or gate
## ADDED Requirements

### Requirement: Admin user account management
The system SHALL allow authenticated ADMIN users to create, list, read, update, deactivate, and reactivate user accounts with any supported role. Admin-created accounts SHALL use an admin-supplied password and SHALL NOT issue an authentication token from the create endpoint.

#### Scenario: Admin creates user with roles
- **WHEN** an authenticated ADMIN submits email, password, display name, and one or more roles to `POST /admin/users`
- **THEN** the system SHALL hash the supplied password, create the user, assign the requested roles, and return a safe user projection with `id`, `email`, `displayName`, `roles`, and `status`
- **AND** the response SHALL NOT include `passwordHash` or an access token

#### Scenario: Non-admin cannot create user
- **WHEN** an authenticated user without ADMIN role submits `POST /admin/users`
- **THEN** the system SHALL reject the request as forbidden

#### Scenario: Duplicate email is rejected
- **WHEN** an admin creates a user with an email already registered to another account
- **THEN** the system SHALL reject the request with a conflict error

#### Scenario: Admin lists users by role and status
- **WHEN** an authenticated ADMIN requests `GET /admin/users` with optional `role` or `status` filters
- **THEN** the system SHALL return safe user projections matching the filters

#### Scenario: Admin reads user detail
- **WHEN** an authenticated ADMIN requests `GET /admin/users/:id` for an existing user
- **THEN** the system SHALL return a safe user projection with roles and status

#### Scenario: Missing user returns not found
- **WHEN** an authenticated ADMIN requests `GET /admin/users/:id` for a missing user
- **THEN** the system SHALL return a not-found error

#### Scenario: Admin updates user profile and roles
- **WHEN** an authenticated ADMIN submits `PATCH /admin/users/:id` with `displayName` or `roles`
- **THEN** the system SHALL update the user's profile fields and role assignments atomically
- **AND** the system SHALL validate all submitted roles against supported role values

#### Scenario: Removing check-in role revokes active assignments
- **WHEN** an authenticated ADMIN updates a user so their roles no longer include `CHECKIN_STAFF`
- **THEN** the system SHALL revoke that user's active check-in staff assignments without deleting assignment history

#### Scenario: Admin deactivates user
- **WHEN** an authenticated ADMIN submits `PATCH /admin/users/:id/status` with a non-active status such as `DISABLED`
- **THEN** the system SHALL set the user's status without hard-deleting the user
- **AND** the system SHALL revoke that user's active check-in staff assignments

#### Scenario: Admin reactivates user
- **WHEN** an authenticated ADMIN submits `PATCH /admin/users/:id/status` with `ACTIVE`
- **THEN** the system SHALL reactivate the user without automatically restoring previously revoked check-in assignments

### Requirement: Soft-delete-only user lifecycle
The system SHALL NOT hard-delete user accounts through account management operations. User deactivation SHALL preserve historical relationships for concerts, orders, payments, tickets, check-in events, and assignment history.

#### Scenario: Deactivation preserves history
- **WHEN** an admin deactivates a user who created concerts, purchased tickets, made payments, owns orders, or performed check-in events
- **THEN** the system SHALL preserve those records and only change user status plus active assignment state

#### Scenario: No hard-delete endpoint
- **WHEN** the account management API is exposed
- **THEN** it SHALL NOT provide an endpoint that hard-deletes a user row
