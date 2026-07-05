## 1. Database & Schema

- [x] 1.1 Add `PasswordResetToken` model to `prisma/schema.prisma` with fields: `id` (cuid), `token` (unique string), `userId` (FK to User, cascade delete), `expiresAt`, `usedAt` (nullable), `createdAt`
- [x] 1.2 Run `prisma migrate dev --name add-password-reset-tokens` to generate and apply the migration
- [x] 1.3 Add `User` relation back-reference `passwordResetTokens PasswordResetToken[]` to the `User` model in schema

## 2. API Types

- [x] 2.1 Add `ForgotPasswordRequestSchema` and `ForgotPasswordRequest` type to `@ticketbox/api-types` (field: `email: string`)
- [x] 2.2 Add `ResetPasswordRequestSchema` and `ResetPasswordRequest` type to `@ticketbox/api-types` (fields: `token: string`, `newPassword: string`, min 8 chars)

## 3. Backend – Domain & Ports

- [x] 3.1 Add `ForgotPasswordError`, `InvalidResetTokenError`, `ResetTokenExpiredError`, `ResetTokenAlreadyUsedError` to `packages/backend/src/identity/domain/errors.ts`
- [x] 3.2 Create `PasswordResetTokenRepository` port interface at `packages/backend/src/identity/domain/ports/password-reset-token-repository.port.ts` with methods: `create(token, userId, expiresAt)`, `findByToken(token)`, `markAsUsed(tokenId)`
- [x] 3.3 Create `EmailSenderPort` interface at `packages/backend/src/identity/domain/ports/email-sender.port.ts` with method: `sendPasswordResetEmail(toEmail, resetLink)`

## 4. Backend – Infrastructure

- [x] 4.1 Create `PrismaPasswordResetTokenRepository` adapter at `packages/backend/src/identity/infrastructure/database/prisma-password-reset-token.repository.ts` implementing `PasswordResetTokenRepository` port using Prisma client
- [x] 4.2 Create `NodemailerEmailSender` adapter at `packages/backend/src/identity/infrastructure/email/nodemailer-email-sender.ts` implementing `EmailSenderPort` using `nodemailer` package; configure from env vars `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- [x] 4.3 Add `nodemailer` package to backend dependencies (`pnpm add nodemailer` and `pnpm add -D @types/nodemailer` in backend package)
- [x] 4.4 Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `FRONTEND_URL` to backend environment configuration/validation

## 5. Backend – Application Use Cases

- [x] 5.1 Create `ForgotPasswordUseCase` at `packages/backend/src/identity/application/use-cases/forgot-password.use-case.ts`: find user by email → if found, generate `crypto.randomBytes(32).toString('hex')` token → save to `PasswordResetToken` with `expiresAt = now() + 1h` → call `EmailSenderPort.sendPasswordResetEmail` → always return void (no error leak)
- [x] 5.2 Create `ResetPasswordUseCase` at `packages/backend/src/identity/application/use-cases/reset-password.use-case.ts`: find token → validate existence, expiry, used status → hash new password via `PasswordHasher` port → update user's `passwordHash` → mark token as used
- [x] 5.3 Write unit tests for `ForgotPasswordUseCase` covering: registered email sends email and stores token; unregistered email does nothing; email send failure does not throw
- [x] 5.4 Write unit tests for `ResetPasswordUseCase` covering: valid token resets password; expired token throws `ResetTokenExpiredError`; used token throws `ResetTokenAlreadyUsedError`; non-existent token throws `InvalidResetTokenError`

## 6. Backend – HTTP Adapter

- [x] 6.1 Add `ForgotPasswordDto` at `packages/backend/src/identity/adapters/http/dto/forgot-password.dto.ts` with `@IsEmail()` validated `email` field
- [x] 6.2 Add `ResetPasswordDto` at `packages/backend/src/identity/adapters/http/dto/reset-password.dto.ts` with `@IsString() @MinLength(8)` `newPassword` and `@IsString() @IsNotEmpty()` `token` fields
- [x] 6.3 Add `POST /auth/forgot-password` endpoint to `auth.controller.ts` delegating to `ForgotPasswordUseCase`; always return `200` with generic message
- [x] 6.4 Apply `@Throttle({ default: { limit: 15, ttl: 900000 } })` to `POST /auth/forgot-password` (15 requests per IP per 15 minutes); install and register `@nestjs/throttler` in `auth.module.ts` if not already present
- [x] 6.5 Add `POST /auth/reset-password` endpoint to `auth.controller.ts` delegating to `ResetPasswordUseCase`; map `ResetTokenExpiredError` and `ResetTokenAlreadyUsedError` to `400 Bad Request` with error codes; map `InvalidResetTokenError` to `400 Bad Request` with generic message
- [x] 6.6 Register `ForgotPasswordUseCase`, `ResetPasswordUseCase`, `PrismaPasswordResetTokenRepository`, and `NodemailerEmailSender` in `auth.module.ts`

## 7. Frontend – API Layer

- [x] 7.1 Add `forgotPasswordRequest(email: string): Promise<void>` to `apps/audience-web/src/shared/api/auth.ts` calling `POST /auth/forgot-password`
- [x] 7.2 Add `resetPasswordRequest(token: string, newPassword: string): Promise<void>` to `apps/audience-web/src/shared/api/auth.ts` calling `POST /auth/reset-password`

## 8. Frontend – Forgot Password Page

- [x] 8.1 Create `ForgotPasswordPage.tsx` at `apps/audience-web/src/features/auth/ForgotPasswordPage.tsx` with email input form, loading state, success message, and error handling per spec `audience-forgot-password`
- [x] 8.2 Add route `/forgot-password` to the audience-web router pointing to `ForgotPasswordPage`
- [x] 8.3 Add "Quên mật khẩu?" link to `LoginPage.tsx` below the password field, linking to `/forgot-password`

## 9. Frontend – Reset Password Page

- [x] 9.1 Create `ResetPasswordPage.tsx` at `apps/audience-web/src/features/auth/ResetPasswordPage.tsx` with: token extraction from query param, new password + confirm password fields, client-side validation (match, min 8 chars), success redirect to `/login` after 2s, error messages for expired/used/invalid token per spec `audience-reset-password`
- [x] 9.2 Add route `/reset-password` to the audience-web router pointing to `ResetPasswordPage`

## 10. Frontend – Google Sign-In on Register Page

- [x] 10.1 Add `GoogleSignInButton` component to `RegisterPage.tsx` with the same `handleGoogleCredential` pattern as `LoginPage.tsx`, including loading state, error handling for `ACCOUNT_LINK_REQUIRED` (redirect to `/login`), and generic error display per spec `audience-google-sign-in`
- [x] 10.2 Add visual separator "hoặc" between Google button and email/password registration form in `RegisterPage.tsx`

## 11. Verification

- [x] 11.1 Run `pnpm build` (or equivalent) to verify no TypeScript compilation errors across affected packages
- [x] 11.2 Run existing backend identity tests (`pnpm test` in backend) to verify no regressions
- [x] 11.3 Manually test forgot password flow: request email → receive link → reset → login with new password
- [x] 11.4 Manually test Google Sign-In on register page: new user provisioned → existing user signed in → `ACCOUNT_LINK_REQUIRED` error shown correctly
- [x] 11.5 Update `.env.example` (or equivalent) with new required env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `FRONTEND_URL`

## 12. Blueprint Conformance Review

- [x] 12.1 Verify `EmailSenderPort` and `NodemailerEmailSender` follow the ports/adapters pattern in `blueprint/design.md` Decision 1 — inner domain layer must not import `nodemailer` directly; only the infrastructure adapter may
- [x] 12.2 Verify `ForgotPasswordUseCase` and `ResetPasswordUseCase` depend only on domain ports (`PasswordResetTokenRepository`, `EmailSenderPort`, `PasswordHasher`, `UserRepository`) and contain no ORM, HTTP, or infrastructure imports
- [x] 12.3 Verify `PrismaPasswordResetTokenRepository` lives in the infrastructure layer (`infrastructure/database/`) and is not imported by any domain or application layer file
- [x] 12.4 Verify `NodemailerEmailSender` lives in the infrastructure layer (`infrastructure/email/`) and is not imported by any domain or application layer file
- [x] 12.5 Verify `auth.controller.ts` contains no business logic — it only calls use cases and maps errors to HTTP responses, consistent with the thin adapter pattern in `blueprint/design.md` Decision 1
- [x] 12.6 Verify domain errors (`InvalidResetTokenError`, `ResetTokenExpiredError`, `ResetTokenAlreadyUsedError`) are defined in `domain/errors.ts` and not in any adapter or infrastructure file
- [x] 12.7 Verify rate limiting on `POST /auth/forgot-password` uses `@nestjs/throttler` backed by the Redis store already used by the platform per `blueprint/design.md` Decision 7 (token bucket rate limiting via Redis), not the default in-memory store
- [x] 12.8 Verify `PasswordResetToken` is added to the PostgreSQL schema via Prisma migration, consistent with `blueprint/design.md` Decision 2 (PostgreSQL as source of truth for all transactional data)
- [x] 12.9 Verify `ForgotPasswordDto` and `ResetPasswordDto` use `class-validator` decorators consistent with all other DTOs in `identity/adapters/http/dto/`
- [x] 12.10 Verify new use cases are registered through NestJS DI in `auth.module.ts` and not instantiated manually anywhere
- [x] 12.11 Verify that **NO code comments** have been added to any of the new or modified source code files, as requested (code must be completely free of comments)
