## 1. Branch & Dependencies Setup

- [x] 1.1 Create and checkout branch `feature/implement-auth-rbac` from `dev`
- [x] 1.2 Install required npm packages: `@nestjs/passport`, `passport`, `passport-jwt`, `@nestjs/jwt`, `bcrypt` and their types (`@types/passport-jwt`, `@types/bcrypt`)
- [x] 1.3 Verify Prisma schema has `User`, `Role` enum (`AUDIENCE`, `ORGANIZER`, `CHECKIN_STAFF`, `ADMIN`), and `UserRole` join table — add if missing and run `prisma migrate dev`

## 2. Config: Add JWT Environment Variables

- [x] 2.1 Add `JWT_SECRET` (required string) and `JWT_EXPIRY` (default `'1h'`) and `BCRYPT_ROUNDS` (default `12`) to `packages/backend/src/platform/config/env.schema.ts`
- [x] 2.2 Add `jwtSecret`, `jwtExpiry`, and `bcryptRounds` getters to `PlatformConfigService`
- [x] 2.3 Update `.env.example` with `JWT_SECRET=changeme`, `JWT_EXPIRY=1h`, `BCRYPT_ROUNDS=12`

## 3. Domain: Role Enum & JWT Payload Type

- [x] 3.1 Create `packages/backend/src/identity/domain/role.enum.ts` — export `Role` enum with values `AUDIENCE`, `ORGANIZER`, `CHECKIN_STAFF`, `ADMIN`
- [x] 3.2 Create `packages/backend/src/identity/domain/jwt-payload.interface.ts` — export `JwtPayload` interface with `sub: string` and `roles: Role[]`

## 4. Auth Module: Service

- [x] 4.1 Create `packages/backend/src/identity/auth.service.ts` with `register(dto)` method: validate unique email, hash password with bcrypt, create user with `AUDIENCE` role, return signed JWT
- [x] 4.2 Add `login(dto)` method to `AuthService`: find user by email, compare password hash with bcrypt, throw `UnauthorizedException` on failure (no email-existence leak), return signed JWT on success
- [x] 4.3 Add `generateToken(user)` private method: call `JwtService.sign({ sub: user.id, roles: user.roles })` and return the token string

## 5. Auth Module: Controller & DTOs

- [x] 5.1 Create `packages/backend/src/identity/dto/register.dto.ts` — `RegisterDto` with `email` (IsEmail), `password` (MinLength 8), `displayName` (IsNotEmpty, IsString) and class-validator decorators
- [x] 5.2 Create `packages/backend/src/identity/dto/login.dto.ts` — `LoginDto` with `email` (IsEmail) and `password` (IsString, IsNotEmpty)
- [x] 5.3 Create `packages/backend/src/identity/auth.controller.ts` — `POST /auth/register` calls `authService.register(dto)` returns `201`; `POST /auth/login` calls `authService.login(dto)` returns `200`

## 6. JWT Strategy & Guards

- [x] 6.1 Create `packages/backend/src/identity/strategies/jwt.strategy.ts` — extends `PassportStrategy(Strategy, 'jwt')`, extracts bearer token, validates payload, returns `{ id, roles }` as `req.user`
- [x] 6.2 Create `packages/backend/src/identity/guards/jwt-auth.guard.ts` — extends `AuthGuard('jwt')` from `@nestjs/passport`
- [x] 6.3 Create `packages/backend/src/identity/decorators/roles.decorator.ts` — `@Roles(...roles: Role[])` using `SetMetadata(ROLES_KEY, roles)`
- [x] 6.4 Create `packages/backend/src/identity/guards/roles.guard.ts` — implements `CanActivate`, reads `ROLES_KEY` metadata from handler and class, checks `request.user.roles` includes at least one required role, returns `true` or throws `ForbiddenException`

## 7. Sample Protected Route

- [x] 7.1 Create `packages/backend/src/identity/profile.controller.ts` — `GET /me/profile` decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.AUDIENCE)` (all authenticated users), returns `req.user` payload as profile response

## 8. Auth Module Wiring

- [x] 8.1 Create `packages/backend/src/identity/auth.module.ts` — imports `PassportModule`, `JwtModule.registerAsync(...)` using `PlatformConfigService`, `DatabaseModule` for `PrismaService`; declares `AuthController`, `ProfileController`; provides `AuthService`, `JwtStrategy`, `JwtAuthGuard`, `RolesGuard`; exports `AuthModule` (so other modules can import it)
- [x] 8.2 Import `AuthModule` in `packages/backend/src/platform/backend-core.module.ts` (or directly in `AppModule`) so it is active
- [x] 8.3 Ensure `ValidationPipe` (with `whitelist: true, forbidNonWhitelisted: true`) is enabled globally in `apps/api/src/main.ts`

## 9. Unit Tests: AuthService

- [x] 9.1 Create `packages/backend/src/identity/auth.service.spec.ts` — mock `PrismaService` and `JwtService`; test `register` happy path returns token
- [x] 9.2 Test `register` with duplicate email throws `ConflictException`
- [x] 9.3 Test `login` happy path returns token
- [x] 9.4 Test `login` with wrong password throws `UnauthorizedException`
- [x] 9.5 Test `login` with non-existent email throws `UnauthorizedException` (same error as wrong password)

## 10. E2E Tests: Register & Login Flows

- [x] 10.1 Create `test/auth/auth.e2e-spec.ts` — bootstrap full NestJS app with test database; test `POST /auth/register` happy path returns `201` and a JWT token string
- [x] 10.2 Test `POST /auth/register` with duplicate email returns `409`
- [x] 10.3 Test `POST /auth/register` with invalid payload (missing fields) returns `400`
- [x] 10.4 Test `POST /auth/login` with valid credentials returns `200` and a JWT token string
- [x] 10.5 Test `POST /auth/login` with wrong password returns `401`
- [x] 10.6 Test `GET /me/profile` with valid JWT returns `200` with user payload
- [x] 10.7 Test `GET /me/profile` without token returns `401`

## 11. Verification & Cleanup

- [x] 11.1 Run `npm run test` (unit tests) — all auth service tests pass
- [x] 11.2 Run `npm run test:e2e` — all auth E2E tests pass
- [x] 11.3 Run `npm run build` — no TypeScript errors
- [x] 11.4 Verify `GET /health` still returns `200` (no regression)
- [x] 11.5 Commit all changes on `feature/implement-auth-rbac` and open PR against `dev`
