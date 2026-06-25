## Why

TicketBox can now create and pay orders, but a paid order still does not produce customer-facing QR e-tickets. This change completes the ticket purchase fulfillment path required by the blueprint: after payment confirmation, the system must issue tickets exactly once using unguessable QR tokens stored only as hashes.

## What Changes

- Generate one `tickets` row per purchased ticket quantity when an order transitions to `PAID`.
- Use cryptographically strong QR tokens and store only a hash in PostgreSQL.
- Make ticket issuance idempotent so duplicate payment callbacks or repeated `OrderPaid` handling do not create duplicate tickets.
- Add customer APIs to list owned tickets and get a ticket detail/QR payload for gate check-in.
- Ensure users can only access their own issued tickets.
- Add tests for exact-once issuance, token hashing, ownership checks, and duplicate paid-event handling.
- Defer online check-in scan validation to the later `checkin-offline-sync` change; this change only issues QR tickets and exposes them to the owner.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `ticket-purchase`: Implements and tightens the QR e-ticket requirement for paid orders, including exact-once issuance, hashed QR token storage, and customer-owned ticket retrieval.

## Impact

- **Affected backend module**: `packages/backend/src/ordering/` or a closely scoped ticketing submodule following the existing clean architecture pattern.
- **Affected persistence path**: `tickets` table and paid order transition/event handling.
- **Affected API behavior**: add customer ticket read endpoints such as `GET /me/tickets` and `GET /me/tickets/:id`.
- **Affected security behavior**: raw QR token is returned only to the ticket owner and is never stored in plaintext.
- **Affected tests**: unit tests for issuance use case/token service and adapter tests for ticket persistence and owner access.
