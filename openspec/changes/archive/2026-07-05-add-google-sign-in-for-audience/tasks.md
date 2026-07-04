## 1. Shared Contracts and Configuration

- [x] 1.1 Add `GoogleLoginRequestSchema`/type, reuse the canonical `LoginResponseSchema`, define the stable `ACCOUNT_LINK_REQUIRED` error shape, and extend `MyProfileResponseSchema` with `hasPassword`, `authProviders`, and `externalAvatarUrl` in `packages/api-types/src/auth/auth.contract.ts`; add focused contract tests and rebuild `@ticketbox/api-types`.
- [x] 1.2 Add `google-auth-library` to the root workspace dependencies and update the lockfile without adding any Google client secret or real ID token fixture.
- [x] 1.3 Add `GOOGLE_CLIENT_ID` validation and a typed getter in `packages/backend/src/platform/config/env.schema.ts` and `platform-config.service.ts`; require it in development/production, permit omission in tests only with an overridden fake verifier, and test those rules.
- [x] 1.4 Add typed `VITE_GOOGLE_CLIENT_ID` support in `apps/audience-web/src/vite-env.d.ts` and placeholder values in root `.env.example` and `apps/audience-web/.env.example`; never copy the real local client ID into tracked files.

## 2. Prisma Schema and Migration

- [x] 2.1 Update `prisma/schema.prisma` with required unique `User.normalizedEmail`, nullable `User.passwordHash`, `AuthProvider.GOOGLE`, the `AuthIdentity` relation and provider metadata fields, unique `(provider, providerSubject)` and `(userId, provider)` constraints, and a `userId` index.
- [x] 2.2 Create and review a Prisma migration that preflights case/whitespace-normalized email duplicates, backfills `users.normalized_email = lower(trim(email))`, makes it required and unique, preserves all existing password hashes/users/roles, makes `users.password_hash` nullable, and creates the provider enum/table/indexes/foreign key without backfilling identities.
- [x] 2.3 Regenerate Prisma Client and run `npm run verify:prisma`; inspect the generated migration against adjacent migrations before proceeding.

## 3. Identity Domain and Application Ports

- [x] 3.1 Add a `GoogleIdentityVerifierPort` and safe verified-identity projection under `packages/backend/src/identity/domain/ports`, containing only subject, normalized email input, optional display name, and optional picture URL.
- [x] 3.2 Add a transaction-oriented Google identity persistence port and result types for returning user, newly provisioned user, and account-link-required outcomes; keep Prisma and Google SDK types outside the application/domain boundary.
- [x] 3.3 Add domain errors for invalid Google credentials, disabled linked users, missing local password, and account linking required, with no raw token or provider validation detail in error messages.
- [x] 3.4 Update `UserRecordWithPassword` and related repository types so `passwordHash` is nullable only where persisted users can be OAuth-only while password-required create inputs remain non-null.

## 4. Google Token Verification Adapter

- [x] 4.1 Implement the Google verifier adapter under `packages/backend/src/identity/infrastructure` using `google-auth-library` and the configured audience; verify signature, issuer, expiry, subject, email, and `email_verified` before mapping claims.
- [x] 4.2 Ensure the adapter does not log, persist, echo, or return the raw credential and maps all provider/token verification failures to the generic invalid-Google-credential domain error.
- [x] 4.3 Add focused adapter tests with mocked Google library results for valid claims, invalid signature/audience/issuer/expiry, missing subject/email, unverified email, and optional name/picture absence; tests must not access Google network services.

## 5. Google Identity Persistence

- [x] 5.1 Implement the Prisma Google identity adapter to find `(GOOGLE, providerSubject)`, load the linked user/roles/status, and refresh verified provider email/display-name/picture metadata without changing TicketBox profile or avatar fields.
- [x] 5.2 Implement first-login provisioning in one transaction: derive `trim().toLowerCase()` normalized email, reject any matching normalized user email, create an `ACTIVE` user with null password hash, assign only `AUDIENCE`, and create `AuthIdentity`.
- [x] 5.3 Classify Prisma uniqueness conflicts by re-reading `(GOOGLE, providerSubject)` so concurrent identical first logins converge on one identity, while normalized-email conflicts return account-link-required and never auto-link.
- [x] 5.4 Add repository tests for returning identity, metadata refresh, new-user transaction, role assignment, rollback, case/whitespace-variant email collision including privileged roles, and concurrent provider/normalized-email conflict recovery.

## 6. Google Sign-In Use Case

- [x] 6.1 Implement `GoogleSignInUseCase` to verify the credential through the port, resolve/provision through the persistence port, reject non-`ACTIVE` users and linked users lacking `AUDIENCE`, and issue a TicketBox JWT with the TicketBox user UUID and roles exactly `[AUDIENCE]`.
- [x] 6.2 Confirm the use case never adds roles to returning users, never includes stored `ADMIN`/`ORGANIZER`/`CHECKIN_STAFF` roles in an audience Google JWT, never uses Google `sub` as TicketBox JWT `sub`, and never places Google credentials/provider internals in the response.
- [x] 6.3 Add unit tests for audience-only returning login, multi-role user receiving an audience-only token, linked user without AUDIENCE rejection, disabled user, first-login provisioning, display-name fallback, account-link-required collision, and token issuance failure paths.

## 7. HTTP Endpoint and Module Wiring

- [x] 7.1 Add a strict Google login DTO/mapper using the shared contract and expose `POST /auth/google` from `packages/backend/src/identity/adapters/http/auth.controller.ts` with the canonical `{ accessToken }` success response.
- [x] 7.2 Map invalid credential/disabled outcomes to generic `401`, malformed request to `400`, and email collision to `409` with stable code `ACCOUNT_LINK_REQUIRED`; do not expose provider verification details.
- [x] 7.3 Register the verifier, identity persistence adapter, Google sign-in use case, and configuration dependencies in `packages/backend/src/identity/auth.module.ts` using explicit injection tokens.
- [x] 7.4 Add controller/mapper tests for `200`, `400`, generic `401`, structured `409`, strict request fields, and shared response parsing.

## 8. Nullable Password and Profile Capabilities

- [x] 8.1 Update all user create/update paths and seed helpers to maintain `normalizedEmail`, then update email/password `LoginUseCase`/repository/tests to resolve by the canonical key, return generic invalid credentials for null password hashes, and never call bcrypt comparison with null.
- [x] 8.2 Update `UpdateMyPasswordUseCase`, controller error mapping, and tests so OAuth-only users are rejected safely without generating a password, while current password users keep existing behavior.
- [x] 8.3 Extend profile query port/adapter and identity contract mapper to return `hasPassword`, provider codes, and Google `externalAvatarUrl` while preserving JWT-principal role semantics and excluding password/provider subjects/tokens.
- [x] 8.4 Add profile query/contract tests covering password accounts, OAuth-only accounts, optional provider picture, managed avatar plus external picture, and safe-field exclusions.
- [x] 8.5 Run focused identity tests and `npx tsc -p apps/api/tsconfig.app.json --noEmit` before integrating the frontend.

## 9. Audience Google API and Script Integration

- [x] 9.1 Extend `apps/audience-web/src/shared/api/auth.ts` with a shared-contract-validated `googleLoginRequest(credential)` that posts only `{ credential }` and returns the TicketBox access token.
- [x] 9.2 Enhance the audience API error abstraction in `apps/audience-web/src/shared/api/client.ts` only as needed to distinguish status/code `ACCOUNT_LINK_REQUIRED` without rendering raw backend responses or regressing centralized `401` handling.
- [x] 9.3 Add a typed Google Identity Services script/button wrapper that initializes once with `VITE_GOOGLE_CLIENT_ID`, uses popup/callback mode, handles script/config failure, and never logs or persists the callback credential.
- [x] 9.4 Add unit tests for script initialization, callback credential forwarding, missing client ID, script load failure, and cleanup/re-render behavior using browser mocks rather than the live Google script.

## 10. Audience Login Page

- [x] 10.1 Update `apps/audience-web/src/features/auth/LoginPage.tsx` to retain the email/password form, add an “hoặc” separator and official “Tiếp tục với Google” control, and keep admin/organizer login UI untouched.
- [x] 10.2 On Google success, call the existing `AuthContext.signIn` with the TicketBox JWT and preserve `returnTo`, previous protected-route, and `/` fallback navigation.
- [x] 10.3 Add method-specific loading/duplicate-submission protection and safe messages for invalid Google login, `ACCOUNT_LINK_REQUIRED`, missing configuration, and script/network failure while keeping password login usable.
- [x] 10.4 Add LoginPage tests for button rendering, successful session establishment/navigation, collision guidance, generic `401`, repeated interaction, missing config, and regression of email/password login.

## 11. Account Password and Avatar UI

- [x] 11.1 Update `apps/audience-web/src/shared/api/profile.ts` and consumers to validate and use `hasPassword`, `authProviders`, and `externalAvatarUrl` from the shared profile contract.
- [x] 11.2 Update `AccountPage.tsx`/`PasswordChangeForm.tsx` so the current-password form renders only when `hasPassword` is true; OAuth-only Google users see a non-actionable Google sign-in status and no first-password/linking controls.
- [x] 11.3 Update shared audience avatar resolution plus `PublicLayout.tsx`, `AccountPage.tsx`, and `AvatarUploader.tsx` to prefer managed `avatarUrl`, then HTTPS `externalAvatarUrl`, then initials/default, without treating the external URL as an asset ID.
- [x] 11.4 Add frontend tests for password-form visibility, Google account status, managed-avatar precedence, Google fallback after managed-avatar removal, and initials fallback.
- [x] 11.5 Review the changed login/account controls for keyboard access, focus behavior, labels, loading states, and Google button branding consistency.

## 12. Integration and Regression Testing

- [x] 12.1 Add backend integration/E2E coverage with an injected fake Google verifier for new-user provisioning, returning audience-only login, multi-role token scoping, no-AUDIENCE rejection, case-variant structured email collision, disabled user, canonical JWT claims, and no partial writes; never use a real Google token.
- [x] 12.2 Extend auth/profile E2E coverage for null-password rejection, unchanged password registration, admin/staff password creation, safe profile capabilities, and managed/external avatar values.
- [x] 12.3 Run focused backend Vitest suites, `npm run build:api-types`, `npx tsc -p apps/api/tsconfig.app.json --noEmit`, and `npm run test:e2e` when the test database is available; record any environment-only skips.
- [x] 12.4 Run `npm --workspace @ticketbox/audience-web run typecheck`, `npm --workspace @ticketbox/audience-web run test`, and `npm --workspace @ticketbox/audience-web run build`.

## 13. Documentation and Final Verification

- [x] 13.1 Document Google Cloud Web Application setup, Testing users, `http://localhost:5173` Authorized JavaScript origin, future production origins, environment variables, and the absence of Gmail scopes/client secret in the frontend.
- [x] 13.2 Document account behavior: Google `sub` identity, canonical normalized email uniqueness, first-login AUDIENCE provisioning, audience-only JWT scope, no email auto-linking, `ACCOUNT_LINK_REQUIRED`, nullable passwords, and managed-avatar/external-picture precedence.
- [x] 13.3 Inspect the migration and final diff for leaked Client IDs, Client Secrets, Google credentials, raw tokens, unrelated portal changes, or generated artifacts that should not be committed.
- [x] 13.4 Run `npm run verify:prisma`, relevant workspace verification commands, and `openspec validate --changes "add-google-sign-in-for-audience"`; leave all artifacts and implementation status consistent with actual results.
