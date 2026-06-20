## Why

The backend and check-in mobile app currently define the same public HTTP data shapes independently, and those definitions have already drifted: mobile expects login to return a staff profile although the accepted login requirement and backend return only an access token, mobile includes transport/UI states in its scan result type, and mobile calls a staff-assignment endpoint that the backend does not expose. A shared, framework-independent contract package is needed now to make these boundaries explicit before further check-in and offline-sync work multiplies the incompatible definitions.

## What Changes

- Add the workspace package `@ticketbox/api-types` under `packages/api-types` with controlled public exports for authentication, staff profile/role codes, active staff assignments, and online scan request/response contracts.
- Make the canonical login flow two-step: `POST /auth/login` continues to return only the JWT access token, then the authenticated client loads the staff profile from `GET /me/profile`. Expand the public profile contract to include the identity fields the mobile session requires.
- Compose `GET /me/profile` from the already verified JWT principal (`id` and `roles`) plus a safe database projection (`email` and `displayName`); this enrichment does not reload roles, reauthorize the request, or change current JWT/guard behavior.
- Add a Checkin-owned staff-facing `GET /checkin/assignments` query that returns only the authenticated check-in staff user's active concert/gate assignments through a Checkin application query port and infrastructure read projection; Identity authorization and assignment-management rules remain unchanged.
- Make `deviceId` mandatory for every online scan request, using a non-empty installation-scoped identifier of at most 160 characters; align the shared schema, NestJS DTO, mobile request construction, and tests so invalid requests fail before check-in processing.
- Keep online scan business results limited to `accepted`, `duplicate`, `invalid`, and `unassigned`; keep HTTP `401`/`403`, network failures, endpoint unavailability, loading, submitting, and camera state outside the API result contract.
- Migrate backend HTTP adapters through typed pure response mappers whose outputs are validated in contract tests, and migrate the mobile API client through runtime Zod parsing; then remove duplicate wire types only after usage inventory and compatibility tests pass.
- Preserve backend domain/application ownership, Prisma/database enums, NestJS authorization behavior, mobile feature/UI state, and all current check-in correctness rules; the only intentional request-validation tightening is that online scan `deviceId` becomes required and bounded to the existing database length.
- Add contract and integration coverage for `login -> profile -> active assignments -> selected assignment -> online scan -> mobile result mapping`; fake mobile-client tests alone do not satisfy compatibility verification.

## Capabilities

### New Capabilities

- `shared-api-contracts`: Defines ownership, dependency boundaries, public exports, and compatibility guarantees for the framework-independent `@ticketbox/api-types` package.

### Modified Capabilities

- `auth-login`: Clarifies that successful login returns a JWT access token only and that clients obtain profile data through the authenticated profile endpoint.
- `identity-access`: Defines the public profile/role-code contract while preserving the current verified-JWT authorization snapshot.
- `checkin-mobile-app`: Replaces mobile-local wire contracts with shared contracts while retaining session, transport, loading, submitting, scanner, and UI result state locally.
- `checkin-offline-sync`: Defines the Checkin-owned active-assignment query API and canonical online scan wire request/response, separates business results from HTTP/transport states, and requires backend/mobile contract compatibility.

## Impact

- New workspace: `packages/api-types` with Zod as the canonical runtime wire-schema dependency and TypeScript types inferred from those schemas.
- Backend: identity and Checkin HTTP adapters, scoped DTO/schema compatibility, profile response mapping, a Checkin-owned staff-assignment query port/read adapter, and required online-scan `deviceId` request validation. Identity continues to own role and assignment authorization/management; Concert Management continues to own concert behavior; domain/application layers do not depend on `@ticketbox/api-types`.
- Mobile: auth/profile sequence, assignment and online-scan API client methods, stable installation ID provisioning for required `deviceId`, runtime response parsing, session mapping, and removal of duplicate API wire types after migration.
- Accepted specs: `auth-login`, `identity-access`, `checkin-mobile-app`, and `checkin-offline-sync`; no Concert, TicketType, Order, database schema, persisted enum, JWT validation, QR validation, assignment policy, or atomic duplicate-prevention behavior changes.
- Compatibility: login clients remain compatible because the existing token-only response is retained. The profile response gains fields required by the declared public profile contract, and `GET /checkin/assignments` is additive. Online scan callers that omit, blank, or exceed 160 characters for `deviceId` intentionally become invalid and receive HTTP `400`; inventory and migration tasks update every in-repository caller before duplicate aliases are removed.
