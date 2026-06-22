## 1. Module Setup

- [x] 1.1 Create `packages/backend/src/checkin` with `adapters/http`, `application/use-cases`, `domain`, and `infrastructure/database` folders.
- [x] 1.2 Add `CheckinModule` and wire it into `BackendCoreModule` and `packages/backend/src/index.ts`.
- [x] 1.3 Import `AuthModule` and `DatabaseModule` so the check-in module can reuse JWT guards, role guards, assignment authorization, and Prisma.

## 2. Domain and Application Contract

- [x] 2.1 Define online scan command, mobile-facing result statuses, `reasonCode`, and response metadata types.
- [x] 2.2 Define check-in repository/ticket lookup ports for QR hash lookup, assignment verification, scan-event recording, accepted check-in transaction, and duplicate detection.
- [x] 2.3 Implement the online scan use case with validation order: authenticated staff actor, active assignment, QR ticket lookup, concert match, duplicate check, accepted persistence.
- [x] 2.4 Map identity assignment failures to `unassigned` scan results while leaving missing/invalid JWT and missing `CHECKIN_STAFF` role as HTTP authorization errors.
- [x] 2.5 Verify submitted `assignmentId` belongs to the authenticated staff user, requested concert, and optional gate before accepting a scan.
- [x] 2.6 Keep QR issuance behind a hash/parser adapter or shared helper, documenting the assumed Member 3 QR payload/hash contract.

## 3. Persistence and Consistency

- [x] 3.1 Implement a Prisma adapter that looks up issued tickets by `qrTokenHash` and reads ticket concert/status/check-in state.
- [x] 3.2 Implement accepted scan persistence in a transaction that inserts an `ACCEPTED` online `checkin_events` row and updates the ticket checked-in fields.
- [x] 3.3 Map the existing one-accepted-check-in partial unique index violation to a `duplicate` result for concurrent scans.
- [x] 3.4 Record rejected scan attempts for authenticated staff when the current schema has the required `concertId` and `staffId`.
- [x] 3.5 Verify the target branch contains the partial unique index for one accepted event per ticket; add a migration only if it is missing.

## 4. HTTP API

- [x] 4.1 Add `POST /checkin/scan` controller protected by `JwtAuthGuard`, `RolesGuard`, and `@Roles(Role.CHECKIN_STAFF)`.
- [x] 4.2 Add request DTO validation for `assignmentId`, `concertId`, optional `gate`, `qrPayload`, `scannedAt`, and `deviceId`.
- [x] 4.3 Return lower-case mobile-facing scan statuses: `accepted`, `duplicate`, `invalid`, and `unassigned`.
- [x] 4.4 Include `message`, `reasonCode`, `ticketId`, `checkedInAt`, and check-in event metadata when available without exposing QR token secrets.
- [x] 4.5 Keep HTTP and domain response mapping separate from Prisma enum names.
- [x] 4.6 Keep HTTP `401` and `403` responses stable and documented for mobile/offline handoff without modifying React Native app code in this change.

## 5. Tests

- [x] 5.1 Add use-case tests for accepted scan, invalid ticket, wrong concert via `reasonCode`, duplicate ticket, unassigned staff, revoked assignment, and assignment mismatch.
- [x] 5.2 Add repository tests for accepted transaction behavior and duplicate mapping when the accepted-check-in unique index is hit.
- [x] 5.3 Add e2e tests for missing token, non-`CHECKIN_STAFF` user, unassigned staff, accepted scan, and repeated scan.
- [x] 5.4 Add a backend contract test or fixture proving scan statuses and authorization error shapes remain compatible with the check-in mobile API expectations.
- [x] 5.5 Run the relevant backend tests and lint gate for the changed files.

## 6. Verification and Handoff

- [x] 6.1 Run `openspec.cmd validate implement-checkin-api --strict`.
- [x] 6.2 Before merge, confirm the QR payload/hash helper aligns with Member 3's `implement-qr-ticket-issuance`; if Member 3 is not complete, keep the smallest local adapter and document the exact hash-input assumption in tests or implementation notes.
- [x] 6.3 Add a handoff note that mobile display mapping for HTTP `401` and `403` to local `unauthorized` belongs to `implement-checkin-mobile-app` or a later mobile/offline follow-up, not this backend API change.
- [x] 6.4 Update the implementation notes or README only if the API contract needs additional handoff documentation for Member 4 mobile/offline sync work.
- [x] 6.5 Confirm the change still excludes React Native app code, SQLite offline queue, batch sync, QR issuance, and VIP guest lookup before marking tasks complete.
