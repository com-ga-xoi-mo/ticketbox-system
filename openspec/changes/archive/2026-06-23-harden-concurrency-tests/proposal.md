## Why

The core ticketing and payment flows are implemented, but the project still needs deterministic evidence that the required concurrency, idempotency, circuit breaker, and rate-limit mechanisms hold under realistic retry and burst conditions. This change turns those requirements into executable tests and demo evidence without expanding product scope.

## What Changes

- Add or complete no-oversell tests for concurrent checkout against a small ticket pool.
- Add or complete per-user limit tests for concurrent same-user checkout attempts.
- Add payment initiation idempotency tests for replay, mismatched payload rejection, and concurrent same-key submission.
- Add duplicate callback/provider-event tests proving tickets are not issued twice.
- Add payment circuit breaker transition tests for `CLOSED`, `OPEN`, `HALF_OPEN`, recovery, and controlled provider-call blocking.
- Add rate limiting tests for allowed traffic, blocked traffic, burst handling, `Retry-After`, and endpoint/policy isolation.
- Add submission-readiness evidence through focused test commands or a script if the existing test layout needs a single reviewer-facing entrypoint.
- Do not add new business behavior, reconciliation workers, offline sync, reminder workers, caching features, or frontend/mobile implementation.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ticket-purchase`: clarify required hardening evidence for no-oversell and per-user limit concurrency tests.
- `payment-reliability`: clarify required hardening evidence for payment initiation idempotency, duplicate callback dedupe, and circuit breaker transition tests.
- `platform-protection`: clarify required hardening evidence for Redis token bucket rate-limit behavior and policy isolation.
- `submission-readiness`: clarify reviewer-facing test evidence for the required technical mechanisms.

## Impact

- Affected code is expected to be primarily test files and optional test/demo documentation or scripts.
- Test scope covers `ordering`, `payment`, and `platform/rate-limiting`; production code changes should be avoided unless a test exposes a confirmed defect and the defect is approved for repair.
- Docker-backed PostgreSQL and Redis may be used for integration tests where in-memory fakes are insufficient to prove transaction locking or Redis-backed behavior.
- Existing APIs and runtime behavior should remain compatible.
