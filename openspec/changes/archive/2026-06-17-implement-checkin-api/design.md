## Context

TicketBox needs the online check-in backend endpoint for Member 4 / Wave 3. The accepted blueprint defines `POST /checkin/scan`, online QR validation, one accepted check-in per ticket, and check-in staff authorization. The current repo already has JWT auth, `Role.CHECKIN_STAFF`, `JwtAuthGuard`, `RolesGuard`, `AuthorizeCheckinAssignmentUseCase`, Prisma models for `Ticket`, `CheckinEvent`, `CheckinStaffAssignment`, and a partial unique index for one accepted check-in event per ticket.

The mobile app skeleton already calls `/checkin/scan` with `assignmentId`, `concertId`, optional `gate`, `qrPayload`, `scannedAt`, and `deviceId`. This change should make that backend contract real while preserving future offline sync work.

## Goals / Non-Goals

**Goals:**

- Add a backend `POST /checkin/scan` endpoint protected by JWT and `CHECKIN_STAFF`.
- Validate the scanned QR payload by hashing or normalizing it according to the ticketing QR-token contract and looking up issued tickets.
- Enforce active staff assignment for the requested concert and optional gate.
- Record scan outcomes in `checkin_events` and update `tickets.checked_in_at` / `tickets.status` only for accepted scans.
- Prevent duplicate accepted check-ins for the same ticket with both application checks and the existing partial unique database index.
- Return stable mobile-facing scan statuses compatible with the current mobile app contract: `accepted`, `duplicate`, `invalid`, and `unassigned`, with `reasonCode` carrying detailed causes.
- Define narrow integration points with Member 3 QR ticket issuance and Member 1 identity/access work.

**Non-Goals:**

- Build or modify React Native app code; this change only defines the backend `/checkin/scan` contract that mobile/offline work can consume later.
- Implement SQLite offline queue, batch offline sync, retry UI, or offline conflict resolution.
- Generate QR tickets or change the paid-order ticket issuance flow.
- Implement VIP guest list lookup.
- Add broad rate limiting, analytics dashboards, or reminder/notification behavior.

## Decisions

### Decision 1: Add a dedicated backend check-in module

Create a `CheckinModule` under `packages/backend/src/checkin` and import it from `BackendCoreModule`. The module should follow the existing clean/hexagonal style:

```text
checkin/
  adapters/http
  application/use-cases
  domain
  infrastructure/database
```

Rationale:

- Check-in is its own bounded context in the blueprint, even though the accepted spec is named `checkin-offline-sync`.
- A dedicated module keeps online scan logic out of identity and ticketing modules.
- Later offline sync can reuse the same domain result types and repository ports without reshaping this endpoint.

Alternative considered:

- Put the endpoint in `identity` because assignment authorization lives there. This would mix authorization management with ticket scan business logic and make future offline sync harder to isolate.

### Decision 2: Reuse identity guards and assignment use case, then verify assignment identity

The controller should use `JwtAuthGuard`, `RolesGuard`, and `@Roles(Role.CHECKIN_STAFF)`. The application use case should call `AuthorizeCheckinAssignmentUseCase` with the authenticated actor, requested `concertId`, and optional `gate`, then verify that the submitted `assignmentId` belongs to the same staff user, concert, and gate before accepting a scan.

Rationale:

- Identity/access already owns role and staff assignment behavior.
- Reusing the exported use case avoids duplicating assignment queries or role rules in check-in.
- The controller handles unauthenticated or non-staff requests as authorization failures; the scan use case handles assigned-vs-unassigned staff as a domain result.
- The mobile app sends `assignmentId` as the selected assignment context, so the backend should not silently ignore it.

Alternative considered:

- Check assignment directly from `checkin_staff_assignments` inside the check-in repository without reusing the identity use case. That is faster to wire but duplicates business policy already defined in identity/access.
- Ignore `assignmentId` and authorize only by `concertId` plus `gate`. That would be simpler, but it weakens the mobile-to-backend contract because the client already sends the selected assignment.

### Decision 3: Depend on a ticket lookup/hash port, not QR issuance internals

The scan use case should depend on a local port such as `CheckinTicketRepositoryPort` plus a QR hash function/provider. The initial Prisma adapter can read from `tickets.qr_token_hash`, but QR generation remains owned by Member 3.

Expected integration behavior:

- If Member 3 exposes a shared QR token hasher or payload parser, use that shared contract.
- If not yet available, add the smallest local adapter needed to hash `qrPayload` in the same format agreed by ticket issuance and document the assumption in tests.
- Do not change QR issuance or ticket ownership behavior in this change.

Rationale:

- Online check-in needs to validate tickets but should not own ticket creation.
- A port keeps the check-in use case testable without Prisma and limits future churn if Member 3 changes QR payload shape.

Alternative considered:

- Parse QR payload structure directly in the controller. That leaks ticketing details into HTTP code and makes duplicate, invalid-scan, and concert-mismatch tests harder to isolate.

### Decision 4: Separate HTTP auth errors, scan statuses, and detailed reasons

Use lower-case, mobile-facing scan statuses in successful HTTP responses:

```text
accepted
duplicate
invalid
unassigned
```

Use an optional `reasonCode` for detailed causes:

```text
INVALID_TICKET
WRONG_CONCERT
TICKET_NOT_ISSUED
REVOKED_ASSIGNMENT
ASSIGNMENT_MISMATCH
```

Unauthenticated requests and authenticated users without the `CHECKIN_STAFF` role should remain HTTP `401` or `403` responses with a stable error shape. This change should document or test the backend contract so later mobile/offline work can map those transport authorization errors to its local `unauthorized` result state without changing React Native app code here.

Map scan statuses internally to existing persistence concepts such as `ACCEPTED`, `DUPLICATE`, `INVALID`, `WRONG_CONCERT`, and `UNASSIGNED_STAFF`.

Rationale:

- The existing mobile client types already use lower-case statuses.
- The database enum already uses uppercase values and should not drive external API naming.
- A mapping layer keeps the API stable even if persistence enum names change.
- This avoids treating real auth failures as successful scan results while still letting the mobile UI render business rejections as scan outcomes.

Alternative considered:

- Return raw Prisma enum values. That couples the mobile app to database naming and makes API responses less idiomatic.
- Return more granular first-class statuses for invalid tickets, concert mismatch, and unassigned staff. That is more explicit, but it conflicts with the already-implemented mobile app contract.

### Decision 5: Persist accepted scans transactionally and rely on the database for final duplicate prevention

For a valid ticket and assigned staff, the Prisma adapter should perform the accepted path in a transaction:

1. Re-read the ticket by QR token hash.
2. Reject if the ticket is voided/refunded/not issued with `status = invalid` and a specific `reasonCode`.
3. Reject concert-mismatch scans with `status = invalid` and `reasonCode = WRONG_CONCERT` when the ticket concert differs from `concertId`.
4. Reject as `duplicate` if the ticket already has `checkedInAt` or an accepted event exists.
5. Insert `checkin_events` with `source = ONLINE` and `result = ACCEPTED`.
6. Update the ticket to checked-in status and set `checkedInAt`.

The existing partial unique index on `checkin_events(ticket_id) WHERE result = 'ACCEPTED'` remains the final guard against concurrent duplicate acceptance. If two scans race, the losing transaction should map the unique violation to `duplicate`.

Rationale:

- Application checks provide clear user-facing results.
- Database uniqueness is still required for correctness under concurrent scans.

Alternative considered:

- Only check `tickets.checked_in_at` before insert. This is simpler but can race under two simultaneous scans.

### Decision 6: Record rejected scan attempts where the schema can safely support them

The API should record rejected attempts for authenticated staff when the request includes a valid target concert and staff user. Accepted, duplicate, invalid, concert-mismatch, and unassigned outcomes can create `checkin_events` records when the required foreign keys are available.

Unauthenticated or non-`CHECKIN_STAFF` requests should not create scan events because there is no trusted staff actor.

Rationale:

- Rejected attempts are useful for audit and demo evidence.
- The current `checkin_events` table requires `concert_id` and `staff_id`, so auth failures cannot be recorded consistently there.

Alternative considered:

- Persist every failed request in `checkin_events`. This would require nullable staff or a separate security audit table, which is beyond this narrow change.

## Risks / Trade-offs

- [Risk] Member 3 QR token format is incomplete or changes later. -> Mitigation: implement the check-in use case behind a QR hash/lookup port and document the exact assumed payload/hash contract in tests.
- [Risk] Mobile app currently expects a smaller lower-case status set than the database enum. -> Mitigation: keep an explicit backend response mapper and expose detailed causes through `reasonCode`, while leaving mobile client behavior changes to the mobile/offline change.
- [Risk] Prisma schema cannot represent PostgreSQL partial unique indexes directly. -> Mitigation: rely on the existing SQL migration/index and add tests that prove concurrent accepted scans collapse to one accepted result.
- [Risk] Returning `unassigned` before ticket validation can hide whether a ticket is valid. -> Mitigation: keep that order to avoid leaking ticket validity to staff without an active assignment.
- [Risk] This change may reveal missing seed data for check-in tickets or assignments. -> Mitigation: keep seeds minimal and add test fixtures local to check-in tests if broader seed ownership belongs to another change.

## Migration Plan

1. Add `CheckinModule` and import/export it through the backend core package.
2. Add domain types, repository ports, use case, HTTP DTOs/controller, and Prisma adapter.
3. Reuse existing `tickets`, `checkin_events`, and `checkin_staff_assignments` tables. Add a migration only if implementation proves the accepted-check-in partial unique index is missing in the target branch.
4. Add unit tests for the use case and e2e tests for the endpoint/result contract.
5. Rollback by removing the module import and files for this change; existing database tables are shared blueprint schema and should not be dropped by this change.

## Open Questions

- The final QR payload/hash helper should be aligned with Member 3's `implement-qr-ticket-issuance` output before implementation merges. Until then, this change should use a small adapter and tests that clearly state the assumed hash input.
- The mobile unauthorized display behavior belongs to `implement-checkin-mobile-app` or a later mobile/offline follow-up. This backend change should only keep `401` and `403` error shapes stable and document the handoff instead of modifying React Native app code.
