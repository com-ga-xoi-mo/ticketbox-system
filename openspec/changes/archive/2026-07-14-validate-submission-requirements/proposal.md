## Why

TicketBox is close to submission and needs a single validation pass that maps the course requirements to runnable evidence, manual evidence, and known gaps. This change prevents the team from claiming completion based only on implemented code or isolated tests, especially around the required problem areas: ticket contention, traffic spikes, payment instability, offline check-in, CSV import, per-user limits, and public-page caching.

## What Changes

- Add a submission validation plan that traces `docs/requirements.md` requirements to implemented modules, tests, scripts, and manual demo checks.
- Add or improve automated evidence where local deterministic tests are appropriate: checkout concurrency, per-user limits, payment idempotency/callback dedupe, paid-order recovery, rate limiting, circuit breaker behavior, QR issuance, notification delivery, caching, RBAC, and guest-list import.
- Produce a manual evidence checklist for flows that cannot be reliably proven by AI/local automation alone, especially real MoMo/VNPay sandbox redirects, external email inbox delivery, frontend UX review, and real-device offline check-in.
- Treat the payment simulator as allowed supporting test infrastructure, but not the primary submission evidence for real payment provider flows.
- Record explicit gaps when a requirement is not implemented, not covered by automated tests, or only demonstrable manually.
- No business feature, frontend rewrite, architecture redesign, or production-only hardening is introduced by this change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `submission-readiness`: add requirement-level expectations for a comprehensive final validation matrix, automated evidence report, manual evidence checklist, and known-gap tracking before submission.

## Impact

- Affects OpenSpec planning artifacts under `openspec/changes/validate-submission-requirements`.
- Future implementation work will likely add backend test files, evidence scripts, and documentation under existing test/doc locations.
- No production API behavior should change unless validation exposes a bug that must be fixed in a separate, explicitly scoped change.
- Third-party payment submission evidence will require human-driven MoMo/VNPay sandbox steps with configured public tunnel/IPN URLs.
