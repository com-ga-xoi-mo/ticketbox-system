## Context

Payment callbacks currently persist `PaymentStatus.SUCCEEDED` before invoking the order transition. The order transition commits the order and inventory update before publishing the `OrderPaid` side effects that issue tickets. This creates two recoverable partial states:

1. payment is `SUCCEEDED` while the order is still `PENDING_PAYMENT`; and
2. the order is `PAID` while fewer tickets than the purchased quantity exist.

The expiration worker selects orders using only order status and expiration time. A callback/expiration race can therefore release aggregate `reserved_quantity` after payment success has been persisted. Duplicate callback handlers also currently return early when the provider event is duplicated or the payment is no longer pending, so a later delivery cannot finish an incomplete order.

PostgreSQL remains the source of truth. Redis/BullMQ may schedule repair work, but correctness and serialization must come from PostgreSQL transactions and row locks.

## Goals / Non-Goals

**Goals:**

- Provide one idempotent successful-payment finalization use case shared by provider callbacks and repair jobs.
- Serialize payment fulfillment and expiration for the same order.
- Prevent expiration from releasing inventory after successful payment.
- Recover `SUCCEEDED + PENDING_PAYMENT` and `PAID + incomplete tickets` states automatically.
- Preserve inventory constraints and exactly-once ticket issuance under retries and concurrency.
- Surface unrecoverable state conflicts with structured logs and metrics rather than silently swallowing them.

**Non-Goals:**

- Querying a payment provider to determine an unknown payment result.
- Automatically reviving terminal `EXPIRED`, `FAILED`, or `CANCELLED` orders after a late success.
- Redesigning aggregate ticket inventory into a per-order reservation ledger.
- Changing frontend behavior or adding a payment provider.
- Guaranteeing automatic fulfillment when existing data corruption would require overselling inventory.

## Decisions

### Decision 1: Centralize recovery in `FinalizeSuccessfulPaymentUseCase`

Add an application use case that accepts a payment/order identity, completion time, and recovery source (`CALLBACK`, `REPAIR_WORKER`, or future `ADMIN`). It SHALL:

1. load and validate the successful payment and linked order;
2. serialize work for that order through a PostgreSQL order-row lock;
3. if the order is `PENDING_PAYMENT`, perform the paid order and inventory transition exactly once;
4. if the order is already `PAID`, skip the inventory transition;
5. issue only missing tickets until the expected order-item quantity is reached; and
6. return a normalized outcome such as completed, already complete, terminal conflict, or retryable failure.

Provider callback use cases keep provider-specific signature and amount validation, but delegate successful fulfillment to this use case. This avoids separate MoMo, VNPay, simulator, worker, and future admin recovery implementations.

Alternative considered: make each callback retry its own transition logic. Rejected because it duplicates business rules and leaves worker/manual repair behavior inconsistent.

### Decision 2: Use PostgreSQL locking and conditional writes, not a Redis lock

Fulfillment and expiration SHALL lock the same order row before deciding the next state. Ticket type rows SHALL be locked in stable ID order before inventory adjustment. Conditional updates SHALL retain the expected current state so concurrent callers produce one winner and idempotent replays.

Redis is used only for BullMQ scheduling and job deduplication. A Redis lock is not the correctness boundary because lock expiry or Redis failure must not allow conflicting source-of-truth transitions.

### Decision 3: Guard expiration at mutation time

The expired-order query SHOULD exclude orders with a `SUCCEEDED` payment for efficiency, but that filter alone is not sufficient. The expiration transaction SHALL re-read the order and its payments while holding the order lock and SHALL refuse `PENDING_PAYMENT -> EXPIRED` when any linked payment is `SUCCEEDED`.

Skipped inconsistent orders SHALL be logged with order ID, payment ID, order status, and reason without provider secrets or raw callback payloads. The expiration result SHALL distinguish expired, skipped-paid, conflicted, and failed counts.

Alternative considered: rely only on the initial worker query. Rejected because payment status can change after selection and before mutation.

### Decision 4: Duplicate and late successful callbacks are recovery triggers

Provider event deduplication remains required. A duplicate event SHALL NOT create a new payment event, payment attempt, inventory adjustment, or ticket. However, after validation the callback SHALL inspect the current fulfillment state:

- `SUCCEEDED + PENDING_PAYMENT`: invoke finalization;
- `SUCCEEDED + PAID + missing tickets`: invoke ticket completion;
- `SUCCEEDED + PAID + complete tickets`: return an idempotent already-complete response;
- `SUCCEEDED + terminal non-paid order`: return/log a terminal inconsistency without silently changing the state.

This makes duplicate/late callbacks useful recovery opportunities while keeping the repair worker as the guaranteed internal recovery mechanism.

### Decision 5: Repair worker scans persisted truth and uses the same use case

Add a BullMQ repeatable repair job that scans bounded batches for:

- successful payments whose order is not `PAID`; and
- paid orders whose ticket count is lower than the sum of order-item quantities.

The repository query SHALL be indexed/bounded and the processor SHALL call `FinalizeSuccessfulPaymentUseCase` per candidate. Concurrent workers and callbacks are safe because finalization locks the order and uses idempotent writes. Retry/backoff SHALL be bounded, and terminal conflicts SHALL not be retried indefinitely.

This worker does not call providers. A future reconciliation worker may query providers for `PENDING` or unknown payments and then invoke the same finalization use case after establishing success.

### Decision 6: Recover partial ticket issuance by deterministic missing slots

Ticket issuance currently returns all tickets when complete but rejects any partial issuance. Recovery SHALL instead compare existing ticket numbers against the deterministic sequence derived from the order number and item quantities, then create only missing ticket slots while holding the order lock. Existing tickets and QR hashes remain unchanged.

Unique ticket-number and QR-hash constraints remain the final duplicate protection. Notification enqueueing remains best-effort and SHALL not roll back paid order or ticket state.

### Decision 7: Preserve inventory invariants during recovery

The normal paid transition SHALL atomically decrement reserved inventory and increment sold inventory. If persisted `reserved_quantity` is insufficient, recovery SHALL stop with a controlled terminal inconsistency. This change does not reconstruct aggregate inventory automatically because doing so without a per-order reservation ledger can consume another active order's hold.

## Risks / Trade-offs

- [Risk] Existing corrupted inventory cannot be repaired automatically. -> Stop safely, log the payment/order identity, and handle that historical record manually instead of risking oversell.
- [Risk] A provider success can arrive after an order was legitimately expired. -> Record a terminal inconsistency for later refund/reconciliation; do not automatically revive a terminal order in this change.
- [Risk] Callback acknowledgement may be delayed by recovery work. -> Keep provider validation/event recording small, use bounded finalization, and enqueue repair when a retryable internal failure prevents immediate completion.
- [Risk] Repeated repair failures can create an endless job loop. -> Classify retryable versus terminal outcomes, apply bounded backoff, and expose structured counts/logs.
- [Risk] Ticket notification can fail after fulfillment. -> Keep notification retry independent; paid order and issued tickets remain committed.

## Migration Plan

1. Add repository ports and implementations for guarded expiration, recovery candidate scanning, order-level serialization, ticket completeness, and safe inventory recovery.
2. Add `FinalizeSuccessfulPaymentUseCase` and route successful simulator, MoMo, and VNPay callback paths through it.
3. Update duplicate callback handling to invoke recovery when fulfillment is incomplete.
4. Add the BullMQ repair processor and repeatable job registration with conservative batch and interval defaults.
5. Deploy with repair scheduling disabled or in report-only mode for one run, inspect inconsistent records, then enable automatic repair for eligible states.
6. Rollback by disabling the repair schedule and reverting callback/expiration wiring; no destructive schema migration is required.

## Open Questions

- None for implementation. Provider reconciliation and automatic handling of successful payments on terminal orders remain separate future changes.
