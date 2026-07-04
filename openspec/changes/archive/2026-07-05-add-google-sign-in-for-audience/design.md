## Context

TicketBox currently authenticates every user with a required bcrypt password, issues its own JWT containing `sub` and `roles`, and lets the audience app restore that JWT from browser storage. The audience login page, API contracts, profile projection, password form, and avatar rendering all assume a local password and a managed TicketBox avatar. Google sign-in crosses the audience frontend, shared contracts, NestJS identity boundary, Prisma schema, and Google Cloud configuration, and it introduces an external security boundary whose assertions must be verified server-side.

The local Google Web Application client is already configured outside source control. The implementation must keep password registration and all console/staff provisioning flows compatible, must not auto-link an existing email, and must not turn a Google token into the TicketBox application session.

### Target sequence

```text
Audience /login        Google Identity       TicketBox API        PostgreSQL
      |                       |                    |                   |
      |-- choose account ---->|                    |                   |
      |<-- ID credential -----|                    |                   |
      |-- POST /auth/google ---------------------->|                   |
      |                       |                    |-- verify token --> Google keys
      |                       |                    |-- find (GOOGLE, sub) -->|
      |                       |                    |<-- identity/user -------|
      |                       |                    |-- create atomically ---->| (first login only)
      |<---------------- TicketBox accessToken ---|                   |
      |-- AuthContext.signIn(accessToken)          |                   |
```

## Goals / Non-Goals

**Goals:**

- Authenticate an audience visitor with a verified Google ID token and then issue the existing TicketBox JWT.
- Persist Google identities by the stable provider subject and atomically provision only new `AUDIENCE` users.
- Keep existing email/password, role, guard, token-storage, profile editing, and managed-avatar behavior compatible.
- Represent OAuth-only accounts safely through nullable password hashes and explicit profile capabilities.
- Use a verified Google picture only as an external fallback, never as a TicketBox asset.
- Provide deterministic, testable failure behavior without live Google calls in automated tests.

**Non-Goals:**

- Linking or unlinking Google from an existing TicketBox account, or setting a first local password for an OAuth-only user.
- Google login for the organizer/admin portal, role changes, Google logout/revocation, or refresh-token redesign.
- Storing Google ID/access/refresh tokens or calling Gmail, Drive, Calendar, or other Google APIs.
- Downloading Google pictures into object storage, enabling One Tap, or automating Google Cloud production setup.

## Decisions

### 1. Exchange a verified Google credential for the existing TicketBox JWT

The audience frontend will use Google Identity Services popup/callback mode and submit only `{ credential }` to `POST /auth/google`. A backend adapter using `google-auth-library` will verify signature, audience, issuer, expiry, `sub`, email, and `email_verified`. The application use case receives only a safe verified projection through `GoogleIdentityVerifierPort` and issues an audience-scoped TicketBox JWT with the TicketBox user UUID and roles exactly `[AUDIENCE]`.

This keeps Google outside authorization and session management. Using the Google token directly as the application bearer token was rejected because TicketBox guards, role claims, expiry policy, and revocation-by-status behavior belong to TicketBox. Client-side decode-only verification was rejected because browser claims are untrusted.

### 2. Store provider identities in a separate `AuthIdentity` model

Add an `AuthProvider` enum with `GOOGLE`, and an `AuthIdentity` relation containing `userId`, provider, provider subject, provider email, optional display name/picture URL, and timestamps. Enforce unique `(provider, providerSubject)` and `(userId, provider)` plus an index on `userId`. The provider subject, not email, is the stable external key.

Putting `googleSub` directly on `User` was rejected because it couples the user table to one provider and complicates future providers. Using email as the identity key was rejected because emails can change and because a matching existing TicketBox email must not imply authorization to link.

### 3. Make `User.passwordHash` nullable without weakening password-created accounts

OAuth-only users have `passwordHash = null`; no random password or sentinel hash is generated. Registration, admin account creation, and staff provisioning continue to require and hash a password. Email/password login checks for a non-null hash before bcrypt comparison and returns the same generic unauthorized response for null hash, wrong password, missing user, or disabled user.

`PATCH /me/password` remains a current-password change operation and rejects an OAuth-only account safely without comparing bcrypt against null. First-password setup is a distinct future capability, not an implicit behavior in this change.

### 4. Resolve Google login through one transaction-aware persistence operation

`GoogleSignInUseCase` verifies the credential and delegates identity resolution/provisioning to a dedicated persistence port. The Prisma adapter will:

1. Find `(GOOGLE, sub)` and return its user when present, updating verified provider profile metadata.
2. If absent, compute `normalizedEmail = email.trim().toLowerCase()` and check the unique canonical user-email key.
3. Return an account-link-required result for any existing email, regardless of role.
4. Otherwise create the user, `AUDIENCE` role relation, and `AuthIdentity` in one transaction.

Add a required, unique `User.normalizedEmail` column. The migration first computes `trim().toLowerCase()` for every existing user, explicitly detects canonical duplicates, and must stop for manual resolution rather than arbitrarily merging accounts. All user create/update paths maintain this field, and authentication/collision lookups use it while `User.email` remains the display/contact value. Unique constraints on both normalized email and provider subject protect concurrent writes. Provider-subject conflicts are resolved by re-reading `(GOOGLE, sub)`; if no matching identity exists, a normalized-email conflict remains account-link-required.

Auto-linking by verified email was rejected because the audience endpoint could otherwise expose an existing privileged account and because explicit proof through an authenticated linking flow is out of scope.

### 5. Issue an audience-scoped TicketBox JWT

First-time provisioning assigns only `AUDIENCE`. Returning sign-in loads the linked TicketBox user but requires its current roles to include `AUDIENCE`. The endpoint always issues `{ sub: TicketBox user UUID, roles: [AUDIENCE] }`, even if the persisted user also has privileged roles. A linked user without `AUDIENCE`, or a non-`ACTIVE` user, receives the same generic unauthorized result as an invalid Google credential and no replacement account is created.

This is deliberate authorization scoping: a strong Google credential proves identity but the audience endpoint must not become a login path for admin, organizer, or check-in privileges. Returning all stored roles was rejected because an administrator can change roles after Google identity creation, which would silently broaden this endpoint beyond the proposal. A future privileged Google login must define a separate portal policy.

### 6. Define stable API and error semantics in shared contracts

`GoogleLoginRequestSchema` accepts only a non-empty `credential`; successful responses reuse `LoginResponseSchema`. Invalid Google credentials and disabled users map to `401`. A verified identity whose email belongs to an unlinked account maps to `409` with stable code `ACCOUNT_LINK_REQUIRED`. Validation failures map to `400`. Controllers translate errors; use cases contain decisions.

The backend will never log, persist, or echo the raw Google credential. Tests will inject a fake verifier instead of using real tokens or Google network calls.

### 7. Expose authentication capabilities and external picture separately

The safe current-user profile adds `hasPassword`, `authProviders`, and `externalAvatarUrl`. It does not expose `passwordHash`, provider subject, raw provider records, or tokens. `avatarUrl` retains its existing meaning: the stored public URL of a managed TicketBox avatar asset.

UI avatar precedence is managed `avatarUrl`, then verified Google `externalAvatarUrl`, then initials/default. Provider profile metadata is refreshed after successful Google login. A removed managed avatar therefore reveals the Google fallback without creating/deleting an external asset.

Overloading `avatarUrl` with a Google URL was rejected because it would blur managed-asset lifecycle semantics. Downloading the image was rejected because it adds storage ownership, cleanup, and consent complexity.

### 8. Preserve the existing audience session and degrade only the Google control

The login page loads the official Google Identity Services client, initializes it with `VITE_GOOGLE_CLIENT_ID`, renders the official button, and sends the callback credential through the shared API client. A successful response calls the existing `signIn` and preserves `returnTo` behavior. Missing configuration or script failure disables/hides the Google control with a safe message but leaves email/password login usable.

The account page shows the current password form only when `hasPassword` is true; otherwise it states that the account signs in with Google. Admin/organizer login UI is unchanged.

### 9. Treat Google client IDs as environment configuration

Backend verification reads `GOOGLE_CLIENT_ID` through the validated platform configuration; it is required when `NODE_ENV` is `development` or `production`. Tests may omit it only when they override the verifier, otherwise they supply a non-secret test client ID. Audience rendering reads `VITE_GOOGLE_CLIENT_ID` through typed Vite env and degrades only the Google control when absent. Tracked examples contain placeholders only. Production also requires a matching Google Cloud Authorized JavaScript origin; no client secret is sent to or required by the browser callback flow.

## Risks / Trade-offs

- **[Existing users cannot immediately use Google with the same email]** → Return `ACCOUNT_LINK_REQUIRED` with actionable password-login guidance; implement authenticated linking separately.
- **[Nullable password assumptions can cause bcrypt/runtime failures]** → Update repository projections, login/password use cases, contracts, and regression tests before enabling OAuth provisioning.
- **[Concurrent first logins can duplicate or misclassify accounts]** → Use database uniqueness, one transaction, conflict classification, and a re-read of the provider subject.
- **[Existing rows can contain case-variant duplicate emails]** → Run an explicit preflight grouped by `trim().toLowerCase()` and stop the migration for manual resolution before making `normalized_email` required and unique.
- **[Google picture URLs can change or become unavailable]** → Refresh metadata on login, treat the URL as optional, and retain managed-avatar/default fallbacks.
- **[External script or Google availability can fail]** → Keep email/password form independent and show a safe Google-specific failure state.
- **[A leaked credential could be replayed within its validity window]** → Verify all token claims and audience, use HTTPS in production, never log/store credentials, and issue only the normal short-lived TicketBox JWT after account/status checks.
- **[Making Google config mandatory can disrupt test/deploy environments]** → Add documented placeholders and test injection; validate production configuration explicitly before rollout.

## Migration Plan

1. Add configuration/contracts and the Google verifier dependency without exposing the login UI.
2. Preflight existing emails for canonical duplicates, then apply a migration that backfills and constrains `normalized_email`, makes existing password hashes nullable, and creates `AuthIdentity`; do not backfill identities or modify existing hashes/roles.
3. Deploy backend verification, persistence, endpoint, and nullable-password/profile handling.
4. Deploy the audience Google button and account/avatar capability rendering after the backend route is available.
5. Verify Google Cloud origins for each environment and run focused unit, contract, audience, Prisma, and database-backed E2E checks.

Rollback the audience control first, then the endpoint. The new identity table and nullable column can remain during application rollback; restoring `password_hash NOT NULL` is unsafe while OAuth-only rows exist and therefore requires deleting/migrating those accounts or assigning an explicitly designed credential before a schema rollback.

## Open Questions

No blocking product questions remain for this change. Authenticated account linking, first-password setup, and whether to support Google login for privileged portals are intentionally deferred to separate changes.
