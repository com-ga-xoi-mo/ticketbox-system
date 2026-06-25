## 1. Recovery Contracts and Persistence Queries

- [x] 1.1 Define successful-payment finalization command/result types, recovery source values, and retryable versus terminal outcomes.
- [x] 1.2 Add repository ports for loading successful-payment recovery state and scanning bounded repair candidates.
- [x] 1.3 Implement Prisma queries for `SUCCEEDED` payments with non-paid orders and paid orders with incomplete ticket counts.
- [x] 1.4 Add repository tests proving recovery scans are bounded, deterministic, and exclude fully fulfilled orders.

## 2. Idempotent Successful-Payment Finalization

- [x] 2.1 Implement `FinalizeSuccessfulPaymentUseCase` as the shared callback/worker orchestration path.
- [x] 2.2 Serialize finalization with a PostgreSQL order-row lock and stable ticket-type locking.
- [x] 2.3 Complete `PENDING_PAYMENT -> PAID` with the existing inventory transition exactly once and return already-complete for `PAID` orders.
- [x] 2.4 Reject recovery with a controlled conflict when persisted reservation inventory is insufficient; do not reconstruct aggregate inventory automatically.
- [x] 2.5 Classify `SUCCEEDED` payments linked to `EXPIRED`, `FAILED`, or `CANCELLED` orders as terminal inconsistencies without reviving them.
- [x] 2.6 Add unit and Prisma integration tests for initial failure, retry, concurrent finalization, and reservation-conflict rejection.

## 3. Ticket Fulfillment Recovery

- [x] 3.1 Update ticket issuance persistence to identify deterministic ticket slots already present for a paid order.
- [x] 3.2 Create only missing tickets for partial issuance while preserving existing ticket IDs, numbers, QR hashes, and issuance timestamps.
- [x] 3.3 Keep full replay idempotent and retain unique constraints as duplicate protection.
- [x] 3.4 Add tests for zero, partial, complete, and concurrent ticket issuance recovery.

## 4. Expiration Safety

- [x] 4.1 Exclude orders with linked `SUCCEEDED` payments from the expired-order candidate query.
- [x] 4.2 Add a mutation-time payment-success guard inside the locked expiration transition so a stale worker selection cannot release paid inventory.
- [x] 4.3 Extend expiration results and structured logs with expired, skipped-paid, conflicted, and failed counts.
- [x] 4.4 Add race and integration tests proving expiration never decrements inventory after payment success is persisted.

## 5. Provider Callback Recovery

- [x] 5.1 Route successful simulator callback fulfillment through `FinalizeSuccessfulPaymentUseCase`.
- [x] 5.2 Route successful MoMo IPN fulfillment through `FinalizeSuccessfulPaymentUseCase`.
- [x] 5.3 Route successful VNPay IPN fulfillment through `FinalizeSuccessfulPaymentUseCase`.
- [x] 5.4 Change duplicate/late successful callback handling to retry incomplete fulfillment while preserving provider-event deduplication.
- [x] 5.5 Preserve provider-compatible duplicate acknowledgements and no-op behavior for fully fulfilled orders.
- [x] 5.6 Add callback tests for first-attempt finalization failure, duplicate rescue, late rescue, fully complete no-op, and no duplicate tickets.

## 6. Repair Worker

- [x] 6.1 Add BullMQ queue constants, repeatable scheduling, bounded batch configuration, and dependency wiring for paid-order repair.
- [x] 6.2 Implement the repair processor to call the shared finalization use case for each candidate without querying providers.
- [x] 6.3 Apply bounded retries/backoff only to retryable outcomes and report terminal inconsistencies without endless retries.
- [x] 6.4 Add worker tests for pending-order repair, missing-ticket repair, concurrent callback/worker execution, and already-complete candidates.

## 7. Verification and Operations

- [x] 7.1 Add an end-to-end regression test reproducing `Payment.SUCCEEDED + Order.PENDING_PAYMENT` and proving automatic repair completes order, inventory, and tickets.
- [x] 7.2 Add an end-to-end race test between payment finalization and expiration using real PostgreSQL transactions.
- [x] 7.3 Verify inventory invariants and exact ticket count after repeated callbacks and repair scans.
- [x] 7.4 Document repair worker configuration, structured inconsistency logs, report-only rollout, and the boundary between repair and future provider reconciliation.
- [x] 7.5 Run focused ordering/payment/worker tests, TypeScript compilation, and the relevant integration suite; record the commands and results.
