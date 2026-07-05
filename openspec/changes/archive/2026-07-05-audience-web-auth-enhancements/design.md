## Context

`audience-web` is a React application (Vite) using a custom JWT authentication system — no managed auth library (Clerk, Auth.js, Firebase) is in use. The backend is NestJS following Clean Architecture with dedicated use cases per operation. The database is PostgreSQL accessed via Prisma.

**Current state:**
- Email/password login and registration: fully implemented (frontend + backend)
- Google Sign-In: backend `POST /auth/google` is working; `GoogleSignInButton.tsx` and `googleLoginRequest()` exist; integrated into `LoginPage` but not `RegisterPage`
- Forgot/Reset Password: not implemented anywhere (no frontend pages, no backend endpoints)
- Email service: not present in the codebase

## Goals / Non-Goals

**Goals:**
- Add a full forgot password flow: UI → API → Email → Link → Reset
- Add a reset password flow: validate token from URL, accept new password, update DB
- Integrate Google Sign-In into `RegisterPage` (mirrors existing `LoginPage` behavior)
- Handle all error cases: expired token, already-used token, unregistered email

**Non-Goals:**
- No additional OAuth providers (Facebook, Apple, etc.)
- No changes to the existing password hashing strategy
- No complex HTML email templates (plain text or minimal HTML is sufficient)
- No changes to the backend Google Sign-In flow (already correct)
- **No code comments**: The implementation must not include any code comments. The code must be clean, self-documenting, and entirely free of comments.

## Decisions

### D1: Reset Token Storage – Database table vs. signed JWT

**Decision**: Use a database table (`PasswordResetToken`) in the Prisma schema.

**Rationale**: Reset tokens must be single-use and revocable. A signed JWT cannot be revoked before expiry without a blocklist, adding unnecessary complexity. A DB table is simple, fits the existing Prisma + PostgreSQL setup, and makes token invalidation (mark as used, cascade delete on user) straightforward.

**Alternative considered**: JWT with a dedicated secret — stateless and easy to verify, but cannot be invalidated once issued. Incompatible with the single-use requirement.

**Proposed schema:**
```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  token     String    @unique
  userId    String    @map("user_id")
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("password_reset_tokens")
}
```

**TTL**: 1 hour. Token value is generated as `crypto.randomBytes(32).toString('hex')`.

---

### D2: Email Service – Nodemailer (SMTP) vs. third-party SDK

**Decision**: Use **Nodemailer** with SMTP configuration provided via environment variables.

**Rationale**: No vendor lock-in; works with any SMTP provider (Gmail, Resend, SendGrid, Mailtrap). The team can use Mailtrap in development and a production SMTP in production without code changes. Nodemailer is battle-tested in the Node.js / NestJS ecosystem.

**Alternative considered**: Resend SDK — better DX, but introduces vendor lock-in at a point where the production email provider has not been decided.

**Abstraction**: An `EmailSenderPort` interface is defined in the domain layer. The Nodemailer adapter implements it in the infrastructure layer. Use cases depend only on the port, keeping the domain decoupled from the delivery mechanism.

**Environment variables** (already configured in `.env`): `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_SECURE`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASS`, `EMAIL_FROM`. The adapter reads these at startup. `FRONTEND_URL` needs to be added for building reset links (development default: `http://localhost:5173`).

---

### D3: Forgot Password – response when email is not registered

**Decision**: Always return `200 OK` regardless of whether the submitted email matches a registered account ("If your email is registered, you will receive a reset link.").

**Rationale**: Prevents user enumeration attacks — an attacker cannot probe which emails are registered by observing different responses from the forgot password endpoint.

---

### D4: Frontend route for reset password

**Decision**: Reset links in emails follow the format `https://<FRONTEND_URL>/reset-password?token=<token>`. The frontend reads the token from the query parameter and calls `POST /auth/reset-password`.

**Rationale**: Stateless, straightforward to implement, and consistent with the standard convention for email-based password reset flows.

---

### D5: Google Sign-In on RegisterPage

**Decision**: Reuse the existing `GoogleSignInButton` component and `handleGoogleCredential` logic from `LoginPage`. When a Google credential is successfully obtained, the backend automatically provisions an account if the email is new, or signs in the user if the Google subject is already linked — both are handled by the existing `GoogleSignInUseCase`.

**Rationale**: There is no need to distinguish "register via Google" from "login via Google" on the frontend. The backend's `POST /auth/google` already handles both paths in a single endpoint.

---

### D6: Backend architecture – Forgot/Reset Password use cases

**Decision**: Add 2 new use cases following the existing Clean Architecture pattern:
- `ForgotPasswordUseCase`: look up user by email → generate token → persist to DB → send email via `EmailSenderPort`
- `ResetPasswordUseCase`: find token → validate (exists, not expired, not used) → hash new password via `PasswordHasher` port → update user → mark token as used

**New ports required:**
- `PasswordResetTokenRepository` (port) + `PrismaPasswordResetTokenRepository` (adapter)
- `EmailSenderPort` (port) + `NodemailerEmailSender` (adapter)

---

### D7: Rate limiting on `POST /auth/forgot-password`

**Decision**: Apply rate limiting to `POST /auth/forgot-password` as part of this change.

**Rationale**: The endpoint is unauthenticated and triggers email delivery, making it a target for abuse (email flooding a victim's inbox, SMTP cost amplification). Rate limiting is a standard mitigation and should be in place from the start rather than retrofitted later.

**Approach**: Use NestJS `@nestjs/throttler` (already a common NestJS pattern). Apply a limit of **15 requests per IP per 15 minutes** on the forgot-password endpoint via a route-level `@Throttle()` decorator.

**Alternative considered**: Skipping rate limiting for now — rejected because the endpoint has no other abuse prevention and sends real emails.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Email delivery failure (SMTP timeout or error) | Log the error server-side; return `200 OK` to the client to avoid enumeration; add monitoring/alerting |
| Token expires before the user acts on it | 1-hour TTL with a clear expiry message on the reset page; user can request a new link |
| Spam / repeated forgot-password requests for the same user | Each request creates a new token; previous tokens remain valid until they expire. Invalidating prior tokens on new request can be added later |
| SMTP credentials leaked | Use environment variables only (`EMAIL_SMTP_*`); never hardcode; excluded from VCS via `.gitignore` / `.env.example` |
| Reset link used for phishing | `FRONTEND_URL` is server-controlled; users cannot influence the domain in the generated link |

## Migration Plan

1. Add `PasswordResetToken` model to `prisma/schema.prisma`
2. Run `prisma migrate dev --name add-password-reset-tokens`
3. Add `FRONTEND_URL` to environment variables (SMTP vars are already configured in `.env` under `EMAIL_SMTP_*` and `EMAIL_FROM`)
4. Deploy backend with new endpoints (additive only — no breaking changes to existing auth)
5. Deploy frontend with new routes and Google Sign-In on `RegisterPage`

**Rollback**: All changes are purely additive. Frontend and backend can be rolled back independently without affecting existing authentication flows.

## Open Questions

None.
