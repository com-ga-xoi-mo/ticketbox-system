## Context

TicketBox's backend is a NestJS modular monolith in `packages/backend/`. The platform foundation (`BackendCoreModule`) is complete: PostgreSQL via Prisma, Redis, BullMQ queue, and configuration through `PlatformConfigService` are all wired up. No authentication or authorization exists yet.

The `identity-access` spec in `openspec/specs/identity-access/spec.md` defines the accepted requirements: user registration, login, and role-based access control for `AUDIENCE`, `ORGANIZER`, `CHECKIN_STAFF`, and `ADMIN`. This change implements that contract as a NestJS `AuthModule`.

Current state:
- `AppModule` imports only `BackendCoreModule` and `HealthModule`.
- `packages/backend/src/platform/config/env.schema.ts` defines environment variables. JWT secret must be added here.
- Prisma schema (`prisma/schema.prisma`) has `users`, `roles`, and `user_roles` tables from the platform-foundation change (or they must be added as part of this change).

Stakeholders affected: all downstream modules that need route protection.

## Goals / Non-Goals

**Goals:**
- Implement `POST /auth/register` and `POST /auth/login` endpoints in a clean `AuthModule` under `packages/backend/src/identity/`.
- Hash passwords with `bcrypt` (cost factor configurable, default 12).
- Issue signed JWT access tokens; payload carries `sub` (user UUID) and `roles` array.
- Implement `JwtAuthGuard` (validates bearer token, injects `req.user`) and `RolesGuard` (checks `@Roles()` metadata).
- Implement `@Roles()` custom metadata decorator.
- Apply guards to a sample protected route (`GET /me/profile`) to prove RBAC works end-to-end.
- Unit tests for `AuthService` (register, login, token generation/validation).
- E2E tests for the register and login HTTP flows.

**Non-Goals:**
- Refresh tokens — out of scope; add in a future change.
- OAuth / social login — out of scope.
- Password reset / email verification — out of scope.
- Rate limiting on auth endpoints — handled by the future `platform-protection` change.
- Persisting login sessions in Redis — stateless JWT is sufficient for this change.
- Frontend authentication UI — backend only.

## Decisions

### Decision 1: Use `@nestjs/jwt` + `passport-jwt` strategy for JWT handling

NestJS provides first-class integrations for Passport and JWT. `JwtModule.registerAsync()` reads the secret and expiry from `PlatformConfigService`. The `JwtAuthGuard` extends `AuthGuard('jwt')` from `@nestjs/passport`, which invokes `JwtStrategy` to validate and decode the token.

Alternatives considered:
- Manual `jsonwebtoken` calls: more control but loses Passport ecosystem integration and `@UseGuards` ergonomics.
- Session-based auth (cookies + `express-session`): not appropriate for a stateless API consumed by multiple clients (web, mobile).

### Decision 2: Store roles as a flat array in the JWT payload

The token payload will be `{ sub: string, roles: Role[], iat, exp }`. This avoids a database round-trip on every authenticated request. Since token expiry is short (default 1 hour), stale role data is acceptable.

Alternatives considered:
- Fetch roles from DB on every request: correct but expensive at high request volume.
- Opaque tokens + introspection: adds a round-trip to an auth server; not warranted for this project scale.

### Decision 3: Define `Role` as a TypeScript enum in a shared `identity` package path

`Role` enum lives at `packages/backend/src/identity/domain/role.enum.ts`. Guards and controllers import from there, avoiding duplication across modules.

### Decision 4: `RolesGuard` is applied after `JwtAuthGuard`

Guards execute in order. `JwtAuthGuard` must run first to populate `req.user`. `RolesGuard` reads `req.user.roles` and compares against `@Roles()` metadata. If no `@Roles()` decorator is present on a route, `RolesGuard` passes (open route — still requires a valid JWT if `JwtAuthGuard` is applied).

### Decision 5: AuthModule placed in `packages/backend/src/identity/`

All identity-access domain logic lives under `packages/backend/src/identity/` following the module boundary convention. The module is exported so other NestJS modules can use `JwtAuthGuard` by importing `AuthModule` (or use a global guard setup in `BackendCoreModule`).

### Decision 6: Password hashing uses bcrypt with cost factor 12

bcrypt at cost 12 is the industry baseline — slow enough to resist offline attacks, fast enough for registration/login latency targets. The cost factor is read from config so it can be lowered in tests (cost 1).

### Decision 7: Prisma manages the `users`, `roles`, and `user_roles` tables

The Prisma schema already has `User`, `Role`, and `UserRole` models from the platform-foundation change (or this change adds them). `AuthService` uses `PrismaService` to read/write users. This keeps all DB access consistent with the rest of the monolith.

## Risks / Trade-offs

- [Risk] JWT secret leakage invalidates all tokens. → Mitigation: secret is loaded from env (`JWT_SECRET`), never hardcoded. `.env.example` documents it. Rotate by changing env var and restarting.
- [Risk] No token revocation mechanism (stateless JWTs). → Mitigation: short expiry (1 hour default). Revocation via blocklist is a future enhancement documented as a non-goal.
- [Risk] bcrypt at cost 12 adds ~200-400ms per login under load. → Mitigation: acceptable for auth endpoints; not on the hot read path. Adjust via config if needed.
- [Risk] Roles stored in token can become stale if a user's role changes before token expiry. → Mitigation: 1-hour expiry limits the staleness window. Role change forcing re-login is documented as a future guard option.
- [Risk] Unit tests with real bcrypt are slow. → Mitigation: configure bcrypt cost factor to 1 in test environment via `BCRYPT_ROUNDS=1`.
