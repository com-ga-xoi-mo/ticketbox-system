## 1. Preflight & Baseline

- [x] 1.1 Verify the branch contains archived `implement-inventory-reservation` code, including `PrismaInventoryReservationRepository`, inventory ports, worker wiring, and synced `ticket-purchase` spec scenarios
- [x] 1.2 Run baseline verification before changing behavior: targeted ordering tests and `npm run build`
- [x] 1.3 Inspect `prisma/schema.prisma` and confirm `TicketType.maxPerUser`, `Order.status`, `Order.reservationExpiresAt`, and `OrderItem.quantity` are available for the limit query

## 2. Domain & HTTP Contract

- [x] 2.1 Add a domain error for per-user ticket limit violations with ticket type ID, max limit, existing quantity, and requested quantity
- [x] 2.2 Update `OrderController` error mapping so per-user ticket limit violations return an appropriate HTTP conflict response
- [x] 2.3 Export the new error from `packages/backend/src/index.ts`
- [x] 2.4 Add or update controller tests for per-user limit HTTP mapping

## 3. Transactional Limit Enforcement

- [x] 3.1 Extend locked ticket type records in `PrismaInventoryReservationRepository` to include `maxPerUser`
- [x] 3.2 Add a transaction-local query that aggregates the current user's quantity by requested ticket type across `PAID` orders and active `PENDING_PAYMENT` reservations where `reservationExpiresAt > now`
- [x] 3.3 Validate `existingQuantity + requestedQuantity <= maxPerUser` after acquiring ticket type row locks and before creating the order
- [x] 3.4 Ensure stale pending orders whose `reservationExpiresAt` is in the past are excluded from the limit calculation
- [x] 3.5 Preserve existing idempotency behavior so duplicate `(userId, idempotencyKey)` checkout returns the existing order before applying the new request as another purchase

## 4. Concurrency Safety

- [x] 4.1 Confirm the per-user limit check runs after deterministic `ticket_types FOR UPDATE` locks are acquired
- [x] 4.2 Add tests proving concurrent same-user requests for the same ticket type cannot both pass when the combined quantity exceeds `maxPerUser`
- [x] 4.3 Add tests for multi-ticket checkout where each ticket type limit is evaluated independently

## 5. Verification Tests

- [x] 5.1 Add repository tests for paid quantity counting toward the limit
- [x] 5.2 Add repository tests for active pending reservation quantity counting toward the limit
- [x] 5.3 Add repository tests for expired pending reservation quantity not counting toward the limit
- [x] 5.4 Add repository tests for successful checkout exactly at the per-user limit
- [x] 5.5 Run targeted ordering tests
- [x] 5.6 Run `npm run build`

## 6. Manual Smoke & Documentation

- [x] 6.1 Manually smoke test a seeded ticket type with `maxPerUser`: create an allowed order, verify another request exceeding the cap returns conflict, and verify duplicate idempotency key still returns the original order
- [x] 6.2 Update or add Postman guidance if manual API testing requires new expected error behavior
- [x] 6.3 Review the delta spec against `openspec/specs/ticket-purchase/spec.md` before sync/archive
