## Why

TicketBox already reserves inventory atomically, but checkout still does not enforce `ticket_types.max_per_user`. Without this limit, one user can hold or buy more tickets than allowed, and concurrent same-user checkout requests can bypass the business rule.

## What Changes

- Enforce `maxPerUser` during `POST /checkout/orders` as part of the existing checkout reservation transaction.
- Count each user's existing quantity per requested ticket type across:
  - `PAID` orders
  - active, unexpired `PENDING_PAYMENT` reservations
- Add the requested checkout quantity to the existing quantity and reject before order creation when it exceeds `ticketType.maxPerUser`.
- Make the check concurrency-safe so multiple simultaneous checkout requests from the same user cannot exceed the cap.
- Add ordering domain/application errors and HTTP error mapping for per-user ticket limit violations.
- Add repository/use-case tests for paid quantity, active reservation quantity, expired reservation exclusion, idempotent duplicate checkout, and concurrent same-user bypass attempts.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `ticket-purchase`: Tightens the existing per-user ticket limit requirement so implementation must count paid orders plus active, unexpired reservations and protect against concurrent same-user checkout requests.

## Impact

- **Affected backend module**: `packages/backend/src/ordering/`
- **Affected persistence path**: checkout reservation transaction in the Prisma ordering adapter
- **Affected API behavior**: `POST /checkout/orders` rejects requests that would exceed `ticket_types.max_per_user`
- **Affected tests**: ordering use-case/repository tests and concurrency-focused tests for same-user checkout
- **Dependency note**: this change depends on `implement-inventory-reservation` being present because it extends the transaction/locking path introduced there
