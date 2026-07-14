## Context

This change is a validation and evidence change, not a feature implementation change. The current codebase already contains implementation and tests across ordering, payment, platform protection, notifications, check-in, guest-list import, and AI artist bio. The remaining submission risk is traceability: a grader should be able to see which `docs/requirements.md` problem is covered by which automated test, which manual evidence, and which known limitation.

The validation must account for two payment realities:

- MoMo and VNPay sandbox flows require human interaction, public tunnel/IPN configuration, and provider sandbox availability.
- The local payment simulator remains useful for deterministic failure, timeout, delayed callback, and duplicate callback tests, but it is not the primary final evidence for real payment provider integration.

## Goals / Non-Goals

**Goals:**

- Build a requirement-to-evidence matrix for the required problem areas in `docs/requirements.md`.
- Add missing deterministic automated tests or evidence scripts for backend and platform behavior.
- Produce a manual checklist for external-provider and UI/device flows that cannot be fully automated in local AI execution.
- Separate evidence status into `automated`, `manual`, `not-covered`, and `gap`.
- Keep tests deterministic and avoid long sleeps by using repository/use-case tests, fake clocks, Redis/Postgres test helpers, and focused integration specs.

**Non-Goals:**

- Do not add new business features to force tests to pass.
- Do not redesign checkout, payment, check-in, guest-list, notification, or frontend architecture.
- Do not use simulator-only evidence to claim MoMo/VNPay real sandbox behavior.
- Do not run production-scale load tests; use focused concurrency tests and document manual/load-test limitations.
- Do not resolve unrelated frontend UX or third-party sandbox issues inside this validation change.

## Decisions

### Decision 1: Use a traceability matrix as the submission source of truth

The validation output should include a table with:

- requirement/problem area
- relevant spec(s)
- implementation area
- automated evidence command or test file
- manual evidence steps if needed
- pass criteria
- current status or gap

Rationale: the assignment is judged by required mechanisms, not by how many tests exist. The matrix prevents scattered evidence from being hard to review.

### Decision 2: Keep automated evidence focused on backend invariants

Automated evidence should prioritize code paths where deterministic local tests are meaningful:

| Requirement area | Evidence type | Primary implementation/test area |
| --- | --- | --- |
| No oversell | automated | `PrismaInventoryReservationRepository` concurrency tests |
| Per-user limit | automated | reservation repository and create-order tests |
| Payment idempotency | automated | payment initiation use case and Redis idempotency store tests |
| Duplicate/late callback dedupe | automated | provider IPN/callback use-case tests and ticket issuance tests |
| Paid-order recovery | automated | paid-order recovery use-case, processor, and integration tests |
| Rate limiting | automated | route metadata, actor-key, interceptor, Redis token bucket tests |
| Circuit breaker | automated | Redis circuit breaker and initiate-payment tests |
| QR ticket issuance | automated | QR token service, ticket repository, ticket issuance use-case tests |
| QR email confirmation | automated/manual | purchase confirmation QR delivery integration, SMTP/Maildev/manual Gmail check |
| Public caching | automated | concert cache decorator tests and invalidation tests |
| RBAC/authorization | automated/manual | guards/use-case ownership tests plus manual role demo |
| Guest-list import/report | automated | CSV parser, import use cases, queue worker, report controller tests |
| Offline check-in | automated/manual | batch sync and check-in repository tests plus manual multi-device/mobile flow |
| AI artist bio | automated/manual | AI job/use-case tests plus manual upload/review flow |

Rationale: these tests verify correctness of the critical invariants without relying on a running FE/BE or external providers.

### Decision 3: Treat real provider payment as manual evidence

MoMo and VNPay final submission checks must be manual or semi-manual:

- create order through the actual local app/API
- initiate `MOMO` or `VNPAY`
- complete/cancel/fail payment on the provider sandbox
- verify return URL and authoritative IPN behavior
- verify order status, payment status, ticket issuance, and duplicate callback safety where provider tools allow it

Rationale: sandbox payment depends on browser redirects, provider UI, IPN tunnel availability, and sometimes OTP/captcha or account state. These are not reliable AI-only tests.

### Decision 4: Use simulator only for deterministic reliability cases

The simulator can remain in automated tests for:

- payment failure containment
- timeout behavior
- delayed callback behavior
- duplicate callback behavior
- circuit breaker or provider failure mechanics when real providers are unsuitable

The validation report must label simulator evidence as supporting local reliability evidence, not final proof of real MoMo/VNPay integration.

### Decision 5: Report gaps instead of silently fixing broad features

If validation finds a missing feature such as incomplete reminder worker evidence, offline mobile app gaps, or frontend UX limitations, the output should mark it as a gap with a recommended follow-up change. Only small test/evidence improvements belong here.

## Risks / Trade-offs

- [Risk] A broad validation change can become a hidden feature change. -> Mitigation: tasks must stop and report when a failing requirement needs new behavior rather than missing evidence.
- [Risk] Docker-backed integration tests can be slow or unavailable. -> Mitigation: separate deterministic unit/integration evidence from optional runtime smoke checks.
- [Risk] Third-party sandbox results can change or fail due to provider issues. -> Mitigation: record manual steps, expected screenshots/results, required env, and fallback simulator evidence label.
- [Risk] Existing tests may pass while final user-facing flows still fail. -> Mitigation: include manual UI/demo checklist for end-to-end app behavior.
- [Risk] Requirements are partially encoded in mojibake text in raw reads. -> Mitigation: use the known problem-area headings and existing OpenSpec specs as the authoritative validation map.

## Migration Plan

1. Create validation artifacts and delta spec for submission-readiness.
2. Audit existing tests and implementation paths against each requirement area.
3. Add focused missing automated tests or an evidence script without changing business behavior.
4. Produce a manual checklist for MoMo, VNPay, external email, frontend UX, and offline/mobile behavior.
5. Run only scoped evidence commands and record results.

Rollback is simple: remove the validation artifacts/tests/docs from this change. No runtime data migration is expected.

## Open Questions

- Which final manual payment provider will be demonstrated if MoMo sandbox remains blocked or QR-only for the team account?
- Will the team demonstrate offline check-in with a real mobile device/emulator, or only backend sync API evidence?
- Where should the final evidence report live: `docs/submission-validation.md`, a script output under `docs/evidence/`, or both?
