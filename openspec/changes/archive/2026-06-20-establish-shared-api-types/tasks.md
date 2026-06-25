## 1. Inventory and Confirm Current Contracts

- [x] 1.1 Inventory every backend and mobile definition/import for login, profile, role, assignment, and online scan request/response types, including tests, scripts, and fixtures; identify every online scan caller that omits, blanks, or exceeds the persistence limit for `deviceId`.
- [x] 1.2 Record the current HTTP payloads for `POST /auth/login`, `GET /me/profile`, `POST /checkin/scan`, and authorization errors; confirm that profile `id`/`roles` currently come from the verified JWT principal; and confirm that `GET /checkin/assignments` is absent before implementation.
- [x] 1.3 Confirm the public field mappings (`displayName` versus mobile `fullName`, `gateName` versus `gate`, `id` versus `assignmentId`, and `Date` versus ISO timestamp), record the profile field-source split (`id`/`roles` from JWT and `email`/`displayName` from persistence), and lock them with migration fixtures.

## 2. Create `@ticketbox/api-types`

- [x] 2.1 Create `packages/api-types/package.json`, build `tsconfig.json`, and the required `src/index.ts`, `src/auth/auth.contract.ts`, `src/checkin/assignment.contract.ts`, and `src/checkin/online-scan.contract.ts` structure, with generated runtime JavaScript, declarations, and source maps emitted only to `dist/`.
- [x] 2.2 Configure the package name and root `exports` to point to matching `dist` JavaScript and declaration entrypoints; add clean/build/typecheck scripts, build-before-consumer workspace command ordering, and the Zod dependency without adding NestJS, Prisma, React Native, backend dependencies, source deep imports, or a repository-only path alias for consumers.
- [x] 2.3 Implement Zod schemas and inferred types for `RoleCode`, login request/token response, public staff profile, active staff assignment item and raw-array response, and online scan request with required trimmed non-empty `deviceId` of at most 160 characters; implement the online scan response as a `status`-discriminated union with required `ticketId`/`checkedInAt` for `accepted`, outcome-specific reason-code sets for `invalid` and `unassigned`, and explicitly optional metadata for `duplicate`.
- [x] 2.4 Export only supported public schemas/types/codes from the package root and add dependency-boundary checks that reject `@ticketbox/api-types` imports from backend domain/application layers, reject backend/mobile/workspace imports from `@ticketbox/api-types`, and allow the intended backend HTTP-adapter and mobile API-client consumers.

## 3. Add Contract and Schema Tests

- [x] 3.1 Add positive and negative schema tests for every shared auth, profile, raw-array assignment, and scan contract, including `[]`, rejection of `{ assignments: [...] }`, ISO timestamps, UUIDs, omitted optional fields, role/status values, and unknown invalid payloads; prove that missing, blank, or over-160-character `deviceId`, `accepted` without `ticketId` or `checkedInAt`, `invalid` without an invalid-ticket reason code, `unassigned` without an assignment reason code, cross-outcome reason codes, and `null` optional scan metadata are rejected.
- [x] 3.2 Add scoped compatibility/parity fixtures proving NestJS login and online-scan DTO validation matches the canonical Zod request schemas, including identical trim-before-validation, required, non-empty, and maximum-length behavior for `deviceId`, and prove the trimmed value reaches the online scan command.
- [x] 3.3 Add compile-time, dependency-direction, and public-export tests proving `@ticketbox/api-types` is a dependency leaf; backend domain/application cannot import it; it cannot import backend or mobile code; and consumers cannot obtain backend domain, Prisma, NestJS, network-client, storage, or mobile UI types through its public entrypoint.
- [x] 3.4 Add contract tests for every backend response-mapper variant and parse mapper outputs with the shared Zod schemas, including accepted-result `Date` to ISO conversion and omission of unavailable optional fields.

## 4. Migrate Backend HTTP Adapters

- [x] 4.1 Keep identity/check-in domain and application types local, tighten the local online-scan result into status-discriminated variants so `accepted` requires `ticketId` and `checkedInAt: Date`, and add explicit pure HTTP mappers from local results to shared login, profile, and online-scan response contracts.
- [x] 4.2 Preserve the token-only `POST /auth/login` behavior while validating its mapped response against the shared login response schema.
- [x] 4.3 Add a purpose-built profile query that loads only `email` and `displayName` by authenticated user ID, then expand `GET /me/profile` by composing those fields with `id` and `roles` from the existing verified `AuthenticatedUser`; do not load database role relations or change `JwtStrategy`, `RolesGuard`, token issuance, token claims, expiration, or authorization behavior.
- [x] 4.4 Trim `OnlineCheckinDto.deviceId` before validation, require it to be non-empty and at most 160 characters, and pass the validated trimmed value to the use case; migrate `POST /checkin/scan` request/response adapter typing to the shared contracts and pure mapper, serializing dates to ISO strings, constructing the correct status-discriminated response variant, and omitting unavailable optional metadata; reject invalid device IDs before the use case, do not add runtime response-schema parsing after the check-in transaction, and preserve all existing business statuses, reason codes, authorization behavior, QR checks, and atomic duplicate prevention.
- [x] 4.5 Add backend HTTP contract tests for mapped success payloads and HTTP `401`/`403` status behavior without introducing a shared authorization-error schema; prove that authorization failures do not return a scan business result, every accepted persistence/application result supplies `ticketId` and `checkedInAt` before mapping, and persisted-role drift does not replace the verified JWT role snapshot in the profile response.

## 5. Add or Align the Staff Assignment Endpoint

- [x] 5.1 Add a Checkin-local assignment read model, `StaffAssignmentQueryPort`, and `ListMyCheckinAssignmentsQuery` that list active assignments by authenticated staff user without importing Identity repository implementations, Concert Management domain/application types, Prisma, or shared HTTP contracts into Checkin inner layers.
- [x] 5.2 Implement the port with a Checkin infrastructure Prisma read adapter that filters by JWT-derived staff ID and `ACTIVE` status and projects assignment ID, concert ID/title/start time, optional gate, and status without exposing Prisma records or relocating Identity/Concert business rules.
- [x] 5.3 Add a JWT- and `CHECKIN_STAFF`-guarded Checkin HTTP adapter for `GET /checkin/assignments`, accept no client-supplied staff ID, invoke the Checkin query, and map the local read model to the shared raw-array active-assignment response schema without an envelope object.
- [x] 5.4 Add endpoint/query/adapter tests for own active assignments as a raw JSON array, empty results as `[]`, rejection of an `{ assignments: [...] }` envelope fixture by the shared schema, revoked-assignment exclusion, current concert presentation fields, missing/invalid token `401`, non-staff `403`, and prevention of cross-staff data access.
- [x] 5.5 Add dependency-boundary tests proving Checkin inner layers do not import Prisma, Identity repository implementations, Concert Management domain/application types, or `@ticketbox/api-types`, and verify that listing/selecting an assignment does not replace scan-time ownership, active-status, concert, and gate authorization checks.

## 6. Migrate the Mobile API Client

- [x] 6.1 Add `@ticketbox/api-types` as a mobile dependency and replace mobile-local login/profile/assignment/online-scan wire imports with shared contracts.
- [x] 6.2 Change authentication startup to call token-only `POST /auth/login`, then authenticated `GET /me/profile`, validate both responses, and map them into the local `MobileSession`.
- [x] 6.3 Validate the raw-array active-assignment response and online-scan success responses with shared Zod schemas at the mobile API-client boundary before feature code receives them.
- [x] 6.4 Add mobile API-client tests for bearer headers, raw assignment arrays including `[]`, envelope rejection, invalid success-response rejection, ISO payloads, shared business-result parsing, and status-first `401`/`403` handling against real response fixtures.
- [x] 6.5 Implement a mobile-local asynchronous `getOrCreateInstallationId(): Promise<string>` provider backed by Expo SecureStore: read one dedicated key, reuse its valid value across app restarts and logout/login, create and persist a random UUID only when missing or invalid, never use a fixed fallback or hardware serial, wait for initialization before scanner readiness, include the resolved value in every online scan request, and block submission with a recoverable local error when reading, generating, or persisting a valid identifier fails.

## 7. Keep Transport and UI States Local to Mobile

- [x] 7.1 Define or retain mobile-local mappings from HTTP `401`/`403` status to `unauthorized`, fetch failure to `network-error`, and unavailable endpoint/service responses to `unavailable`; classify failed HTTP status before success-schema parsing, keep authorization error bodies outside `@ticketbox/api-types`, and tolerate existing NestJS `message` values as either a string or string array when extracting optional display text.
- [x] 7.2 Keep loading, submitting, debounce, recoverable-error, session persistence, assignment selection, and camera/scanner states outside `@ticketbox/api-types`.
- [x] 7.3 Update auth, assignment, and scan workflow tests to prove shared business responses and local transport/UI states remain separate and that no failed request is marked accepted locally.

## 8. Remove Duplicate Types After Migration

- [x] 8.1 Re-run the usage inventory after both consumers migrate and identify every remaining duplicate or compatibility alias.
- [x] 8.2 Remove old mobile and backend HTTP wire types only when no production/test consumer remains, while retaining backend domain/application and mobile feature-state types.
- [x] 8.3 Run focused typecheck and contract tests immediately after deletion and restore aliases if any unmigrated consumer or compatibility failure remains.

## 9. Run Build, Typecheck, and Compatibility Verification

- [x] 9.1 Add an integration test using the real backend HTTP routes and real mobile HTTP client for `login -> fetch profile -> list active assignments -> select assignment -> submit online scan -> receive, validate, and map result`; do not substitute a fake mobile client.
- [x] 9.2 Cover accepted, invalid, status-based `401`/`403` authorization failure, unassigned, and duplicate outcomes across HTTP/client mapping; assert the required fields and reason-code subset for every business status; prove authorization failures are never parsed as business results, missing/blank/oversized `deviceId` returns HTTP `400` without check-in side effects, the trimmed valid device ID reaches processing, an accepted response always contains the committed ticket ID and timestamp, and existing backend concurrency and QR-validation behavior is retained.
- [x] 9.3 From a clean generated-output state, build `@ticketbox/api-types` before consumers and run shared-package tests, backend build/typecheck/unit/HTTP contract tests, a NestJS package-root import/runtime-resolution smoke test, mobile build/typecheck/unit tests, an Expo Metro bundle smoke test consuming the compiled package, integration/e2e tests, lint, and dependency-boundary checks.
- [x] 9.4 Run `openspec validate establish-shared-api-types --strict` and resolve every artifact/spec validation error.

## 10. Update Architecture Documentation

- [x] 10.1 Document `@ticketbox/api-types` ownership, allowed contents, and controlled exports using two separately labeled diagrams: a compile-time graph where each arrow means `A imports/depends on B`, and a runtime response-flow graph where each arrow means data flows from A to B; document the shared package as a dependency leaf and preserve the allowed directions defined in the design.
- [x] 10.2 Document the canonical token-only login plus authenticated profile flow, including the JWT `id`/`roles` and persistence `email`/`displayName` field-source split; document the Checkin-owned staff-assignment query port/read adapter and raw-array response, the preserved Identity/Concert ownership, the SecureStore-backed installation-ID lifecycle, and status-based online scan authorization/transport mapping.
- [x] 10.3 Record migration completion, verification commands/results, remaining compatibility aliases if any, and the rollback procedure without claiming Concert, TicketType, Order, or offline-sync scope.

## 11. Resolve Post-Apply Flow Findings

- [x] 11.1 Wire application startup to set auth state to `restoring`, call `AuthSessionController.restore()`, update the root auth state, and load assignments for a restored authenticated `CHECKIN_STAFF` session without another login; keep missing/blocked/failed restoration from loading assignments, coordinate this safely with installation-ID initialization, and add an application-level startup test proving the controller method is actually invoked.
- [x] 11.2 Align optional `OnlineCheckinDto.gate` with `OnlineScanRequestSchema` by trimming before validation and command mapping, retaining omission as valid, rejecting blank-after-trim input with HTTP `400` before the use case, and extending DTO/Zod parity fixtures for omitted, valid, surrounding-whitespace, and blank gate values.
- [x] 11.3 Initialize root scanner state as `initializing`; render scanner-ready text and enable submission only when state is `ready`; disable submission during `initializing` and `submitting`; keep recoverable installation failures visible; and make the retry action await `ScanWorkflow.initialize()` again rather than call `reset()`. Add component/workflow tests proving no submission occurs before readiness, during submission, or after failed initialization until retry succeeds.
- [x] 11.4 Re-run shared-package build/tests, backend contract/parity tests, mobile typecheck/tests, real Nest HTTP/mobile-client integration, lint, dependency-boundary checks, root build, the non-database suite, database-backed auth/check-in E2E when PostgreSQL is available, and strict OpenSpec validation; update the verification record with current counts and leave these remediation tasks incomplete if any required check fails.
