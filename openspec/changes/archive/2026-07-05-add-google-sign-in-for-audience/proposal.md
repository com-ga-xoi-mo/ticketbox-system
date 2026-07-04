## Why

Audience users currently must create and remember a TicketBox password even when they already have a Google account. Adding Google sign-in reduces login friction while preserving TicketBox as the source of truth for users, roles, authorization, and application sessions.

## What Changes

- Add a Google Identity Services button to the audience `/login` page while preserving the existing email/password form and post-login return destination.
- Add `POST /auth/google` to verify a Google ID token server-side, resolve or atomically provision an `AUDIENCE` account, and return the existing TicketBox JWT response.
- Introduce provider-backed external identities keyed by Google `sub`; make password hashes optional for OAuth-only users without changing password requirements for registration, admin creation, or staff provisioning.
- Add a canonical `normalizedEmail = trim().toLowerCase()` user identity key with a database uniqueness constraint so Google collision checks and existing account lookups cannot be bypassed by email casing or surrounding whitespace.
- Reject unlinked Google sign-in when the verified email already belongs to a TicketBox account; do not auto-link by email or inherit privileged roles.
- Scope every JWT issued by the audience Google endpoint to `AUDIENCE`; linked users without the `AUDIENCE` role are rejected and privileged roles are never included in this endpoint's token.
- Expose safe authentication capabilities and an external Google picture fallback in the current-user profile so OAuth-only accounts do not receive an unusable current-password form.
- Add Google client configuration, official token verification, deterministic HTTP errors, migrations, documentation, and automated tests that do not call Google over the network.
- Keep account linking/unlinking, first-password setup, Google token persistence, Gmail/other Google APIs, Google login for console roles, and production Google Cloud provisioning out of scope.

## Capabilities

### New Capabilities

- `audience-google-sign-in`: Google credential verification, external identity persistence, first-login AUDIENCE provisioning, returning login, collision/disabled-account handling, TicketBox JWT issuance, and audience login UI behavior.

### Modified Capabilities

- `auth-login`: Email/password login must use the canonical normalized email key and safely reject users whose optional password hash is absent while preserving generic credential failures.
- `identity-access`: User identity persistence must enforce canonical email uniqueness, and current-user profile/password behavior must represent OAuth-only authentication capabilities and external avatar fallback without exposing provider internals.
- `audience-web-foundation`: The audience app may establish its existing TicketBox session through Google sign-in in addition to email/password login.
- `audience-account-profile`: The account UI must hide current-password change controls for OAuth-only users and apply managed-avatar, Google-picture, then default fallback precedence.

## Impact

- **Database:** `prisma/schema.prisma` and a migration make `users.password_hash` nullable, backfill a unique `users.normalized_email`, and add provider identity records, uniqueness constraints, and relations.
- **Backend identity:** new verifier and persistence ports/adapters, a Google sign-in use case, controller route/error mapping, nullable-password handling, profile projection changes, and `AuthModule` wiring.
- **Contracts and configuration:** `packages/api-types`, backend environment validation/configuration, Vite environment typing, tracked `.env.example` placeholders, and the `google-auth-library` dependency.
- **Audience web:** login API/UI integration plus account/password/avatar presentation changes; existing `AuthContext`, token storage, protected routes, and TicketBox JWT shape remain intact.
- **Operations:** Google Cloud must contain a Web Application client with the deployed audience origins; no client secret is exposed to the browser.
