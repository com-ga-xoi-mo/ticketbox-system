## 1. Baseline And Schema

- [x] 1.1 Verify current branch includes completed payment simulator and MoMo sandbox integration code.
- [x] 1.2 Confirm existing Redis connection/module access used by backend services and how the payment module should inject it.
- [x] 1.3 Confirm no Prisma schema or migration change is needed for this change; PostgreSQL `IdempotencyRecord` is not the primary store.
- [x] 1.4 Decide and document the payment initiation Redis TTL constant.

## 2. API Contract

- [x] 2.1 Add required `idempotencyKey` validation to `InitiatePaymentDto`.
- [x] 2.2 Pass `idempotencyKey` from `PaymentController` into `InitiatePaymentUseCase`.
- [x] 2.3 Map idempotency mismatch and in-progress duplicate errors to clear HTTP `409 Conflict` responses.
- [x] 2.4 Update existing payment Postman collections/environments to send payment initiation idempotency keys.

## 3. Idempotency Domain And Port

- [x] 3.1 Add payment idempotency domain errors for key mismatch and in-progress duplicate.
- [x] 3.2 Define a payment-facing idempotency port for claiming, completing, failing, and replaying Redis initiation records.
- [x] 3.3 Implement deterministic request fingerprinting for normalized `userId`, `orderId`, and provider, while the Redis key remains scoped to `userId` plus `idempotencyKey` so mismatched reuse is detectable.
- [x] 3.4 Ensure replayed response data matches `serializeInitiatedPayment` shape.

## 4. Redis Adapter

- [x] 4.1 Implement a Redis adapter for payment initiation idempotency records.
- [x] 4.2 Use an atomic Redis claim such as `SET key value NX EX <ttl>` or equivalent Lua script to handle concurrent same-key requests.
- [x] 4.3 Return completed records as replay results without calling the payment gateway.
- [x] 4.4 Return in-progress same-hash records as controlled conflicts.
- [x] 4.5 Return same-key different-hash records as key reuse conflicts.
- [x] 4.6 Complete claimed records by storing replay response, payment resource ID, final status, and preserving an appropriate TTL.
- [x] 4.7 Fail closed with a controlled error when Redis is unavailable before any provider call is made.

## 5. Payment Initiation Use Case

- [x] 5.1 Integrate idempotency claim before order validation and provider session creation.
- [x] 5.2 Create payment and provider session only for the first successful claim.
- [x] 5.3 Complete the idempotency record with payment ID and replayable response after payment creation.
- [x] 5.4 Mark or leave records safely when provider initiation fails according to the design.
- [x] 5.5 Preserve existing simulator and MoMo provider behavior outside payment initiation retry handling.

## 6. Tests

- [x] 6.1 Add unit tests for request fingerprint generation and mismatch detection.
- [x] 6.2 Add adapter tests for claim, replay, in-progress duplicate, mismatch, Redis unavailable, and atomic same-key race behavior.
- [x] 6.3 Add `InitiatePaymentUseCase` tests proving duplicate retry returns the original result and does not call the gateway twice.
- [x] 6.4 Add tests proving same key with different provider/order is rejected.
- [x] 6.5 Add concurrency-oriented test proving same-key requests create at most one payment attempt.
- [x] 6.6 Update controller tests for required `idempotencyKey` and `409` error mapping.
- [x] 6.7 Run targeted payment tests and available TypeScript/build checks.

## 7. Manual Testing Docs

- [x] 7.1 Update payment simulator and MoMo Postman docs with payment initiation idempotency steps.
- [x] 7.2 Document expected duplicate retry behavior: same result, same payment ID, no second provider call.
- [x] 7.3 Document expected key reuse mismatch behavior: `409 Conflict`.
