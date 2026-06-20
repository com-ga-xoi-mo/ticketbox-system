## Why

Member 4 / Wave 3 needs a narrow backend check-in API change so the future React Native check-in app can scan issued QR tickets online against a stable contract. The accepted target specs already require online check-in, duplicate prevention, and assigned staff authorization, but the implementation still needs a concrete endpoint, result model, and integration boundary with ticket issuance and identity/access work.

## What Changes

- Add the backend online QR check-in endpoint contract for `POST /checkin/scan`.
- Validate QR ticket payload or token hash against issued tickets from the ticketing module.
- Record each scan outcome in a check-in result model while accepting at most one successful check-in per ticket.
- Enforce authenticated `CHECKIN_STAFF` role and active staff assignment for the target concert and optional gate.
- Return explicit scan result values compatible with the current mobile app contract: `accepted`, `duplicate`, `invalid`, and `unassigned`, with `reasonCode` for details such as `INVALID_TICKET`, `WRONG_CONCERT`, or `REVOKED_ASSIGNMENT`.
- Keep unauthenticated and non-`CHECKIN_STAFF` access as standard HTTP authorization errors with a stable response shape that later mobile/offline work can map to its local `unauthorized` result state.
- Verify the submitted `assignmentId` belongs to the authenticated staff user, requested concert, and optional gate before accepting a scan.
- Define integration points for upstream QR ticket issuance and check-in staff assignment behavior if those pieces are incomplete.
- Keep React Native app code, SQLite offline queue, batch offline sync, QR ticket issuance, and VIP guest lookup out of scope.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `checkin-offline-sync`: Adds an implementation-level online scan API contract and result model that satisfy the accepted online QR check-in and assigned staff requirements.

## Impact

- Backend check-in module: controller, application use case, domain result model, persistence adapter, and tests.
- Ticketing integration: lookup issued tickets by QR token hash or equivalent Member 3 ticket-token contract without owning QR issuance.
- Identity/access integration: reuse JWT authentication, `CHECKIN_STAFF` role checks, and staff assignment authorization from the identity/access capability.
- Database layer: use the existing `tickets` and `checkin_events` model shape from the blueprint, including one accepted check-in per ticket.
- API consumers: establishes the response contract for the future React Native online scan flow and later offline sync work.
