## Why

TicketBox requires authenticated users and role-based access control before any protected feature (ticket purchase, organizer concert management, check-in staff gate access, admin operations) can be built. The `identity-access` spec exists in `openspec/specs/` as the accepted contract but no implementation exists yet. Implementing auth and RBAC now unblocks all downstream modules.

## What Changes

- Implement `POST /auth/register` endpoint: accepts email, password, display_name; hashes password with bcrypt; stores user in PostgreSQL; returns JWT access token.
- Implement `POST /auth/login` endpoint: validates credentials; returns JWT access token on success; rejects without revealing whether email exists.
- Issue and validate JWT access tokens using `@nestjs/jwt` with a configurable secret and expiry.
- Define the `Role` enum: `AUDIENCE`, `ORGANIZER`, `CHECKIN_STAFF`, `ADMIN`.
- Implement `JwtAuthGuard` (validates bearer token and populates `req.user`) and `RolesGuard` (enforces `@Roles()` decorator on routes).
- Implement `@Roles()` custom decorator for annotating required roles on controllers/handlers.
- Apply `JwtAuthGuard` + `RolesGuard` to a sample protected route (e.g., `GET /me/profile`) to demonstrate role-based enforcement.
- Wire the `AuthModule` into the NestJS app so all modules can use `JwtAuthGuard` and `RolesGuard` globally or per-module.
- Add unit tests for `AuthService` covering register, login, and token validation logic.
- Add E2E tests for register and login HTTP flows.

## Capabilities

### New Capabilities

- `auth-registration`: User self-registration via `POST /auth/register` with bcrypt password hashing and JWT issuance.
- `auth-login`: User login via `POST /auth/login` with credential validation and JWT issuance.
- `jwt-token`: JWT access token signing and validation using `@nestjs/jwt`; token payload carries `sub` (user ID) and `roles`.
- `rbac-guards`: NestJS `JwtAuthGuard`, `RolesGuard`, and `@Roles()` decorator enabling declarative role-based endpoint protection.

### Modified Capabilities

- `identity-access`: This change provides the first concrete implementation of the `identity-access` spec. The spec requirements are unchanged; this change satisfies them through the auth module implementation.

## Impact

- **New module**: `packages/backend/src/identity/auth.module.ts` and related services, controllers, guards, and decorators under `packages/backend/src/identity/`.
- **Database**: Requires `users` table and `user_roles` / `roles` tables as defined in the blueprint database schema (managed via Prisma).
- **Config**: JWT secret and token expiry must be added to the environment schema (`platform-config`).
- **App module**: `BackendCoreModule` or `AppModule` imports `AuthModule`.
- **Tests**: Unit tests in `packages/backend/src/identity/` and E2E tests in `test/`.
- **Branch**: `feature/implement-auth-rbac`
- **No breaking changes**: This is a net-new module; existing endpoints (`/health`) are unaffected.
