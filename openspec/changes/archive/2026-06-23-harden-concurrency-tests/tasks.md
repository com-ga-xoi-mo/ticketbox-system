## 1. Coverage Audit And Test Harness

- [x] 1.1 Map existing ordering, payment, and rate-limiting tests against the new delta spec scenarios and list concrete gaps before adding tests
- [x] 1.2 Identify which tests require real Docker PostgreSQL or Redis and which can remain deterministic unit tests with fakes
- [x] 1.3 Add or adjust shared test setup utilities only if needed for isolated database rows, Redis key prefixes, fake timers, or bounded concurrent requests

## 2. Ticket Purchase Concurrency Evidence

- [x] 2.1 Add or complete a no-oversell concurrency test that uses the production checkout reservation transaction path for one ticket type with limited remaining inventory
- [x] 2.2 Assert successful checkout count, rejected checkout count, final `reserved_quantity`, and `sold_quantity + reserved_quantity <= total_quantity`
- [x] 2.3 Add or complete a same-user concurrent checkout test proving `max_per_user` cannot be bypassed by parallel requests
- [x] 2.4 Assert rejected checkout attempts return a controlled availability or per-user limit error without creating extra orders or reservations

## 3. Payment Reliability Evidence

- [x] 3.1 Add or complete payment initiation idempotency tests for same-key replay returning the first result without another provider call
- [x] 3.2 Add or complete payment initiation idempotency tests for same key with different payload being rejected as a controlled conflict
- [x] 3.3 Add or complete concurrent same-key payment initiation tests proving only one provider attempt is created
- [x] 3.4 Add or complete duplicate success callback/provider-event tests proving the order is not transitioned twice and tickets are not issued twice
- [x] 3.5 Add or complete circuit breaker tests for `CLOSED -> OPEN`, `OPEN -> HALF_OPEN`, half-open trial limit, success recovery to `CLOSED`, and failure reopening to `OPEN`
- [x] 3.6 Assert open-circuit payment initiation returns a controlled provider-unavailable error and does not call the provider

## 4. Platform Protection Evidence

- [x] 4.1 Add or complete Redis token bucket tests for allowed requests within capacity and blocked requests over capacity
- [x] 4.2 Add or complete burst/refill tests that avoid long sleeps by using fake timers, injected timestamps, or deterministic store controls
- [x] 4.3 Add or complete `Retry-After` assertions for blocked requests
- [x] 4.4 Add or complete endpoint-specific isolation tests for browsing, checkout, payment initiation, admin write APIs, and check-in sync policies
- [x] 4.5 Add or complete tests proving rate-limited payment initiation does not mutate payment idempotency records, provider calls, or circuit breaker state
- [x] 4.6 Add or complete Redis degradation tests for at least one fail-open policy and one fail-closed policy

## 5. Submission Readiness Evidence

- [x] 5.1 Add or update reviewer-facing documentation or a script that lists the hardening test commands for checkout concurrency, payment idempotency, callback dedupe, circuit breaker, and rate limiting
- [x] 5.2 Ensure the evidence output or documentation maps each command to the required mechanism it proves
- [x] 5.3 Run the targeted hardening test commands locally with Docker PostgreSQL/Redis when required and record the commands/results in the change notes or final response
- [x] 5.4 If a hardening test exposes a production behavior defect, stop and report the discrepancy before implementing a business behavior fix
