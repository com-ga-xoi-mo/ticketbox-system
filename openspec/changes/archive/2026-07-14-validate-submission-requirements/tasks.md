## 1. Requirement Traceability Audit

- [x] 1.1 Read `docs/requirements.md`, `docs/roadmap.md`, `docs/team-change-plan.md`, `blueprint/proposal.md`, `blueprint/design.md`, and relevant `openspec/specs/*` capabilities.
- [x] 1.2 Build a requirement-to-evidence matrix covering no-oversell, traffic spike protection, payment instability, duplicate payment prevention, offline check-in, CSV import, per-user limits, public caching, notification delivery, AI artist bio, RBAC, setup, seed data, and demo readiness.
- [x] 1.3 Classify every requirement row as `automated`, `manual`, `not-covered`, or `gap`.
- [x] 1.4 Record implementation and test paths for each automated evidence item.

## 2. Automated Evidence Coverage

- [x] 2.1 Verify or add focused evidence for no-oversell and per-user concurrent checkout.
- [x] 2.2 Verify or add focused evidence for payment initiation idempotency, duplicate callback dedupe, paid-order recovery, and simulator-only reliability cases.
- [x] 2.3 Verify or add focused evidence for MoMo/VNPay adapter signature, request building, return parsing, and IPN verification without claiming interactive sandbox completion.
- [x] 2.4 Verify or add focused evidence for rate limiting route coverage, actor keys, `429`/`Retry-After`, Redis behavior, and cache TTL/invalidation.
- [x] 2.5 Verify or add focused evidence for QR ticket issuance and purchase confirmation QR email invariants.
- [x] 2.6 Verify or add focused evidence for RBAC/ownership boundaries across audience, organizer, admin, and check-in staff.
- [x] 2.7 Verify or add focused evidence for guest-list CSV validation, duplicate handling, idempotent imports, and structured report behavior.
- [x] 2.8 Verify or add focused evidence for offline check-in API/server sync invariants, duplicate handling, and conflict behavior.
- [x] 2.9 Verify or add focused evidence for AI artist bio upload, generation job, retry, and review behavior if currently supported by backend code.

## 3. Evidence Commands And Report

- [x] 3.1 Create or update a reviewer-facing validation report such as `docs/submission-validation.md`.
- [x] 3.2 Document minimal automated evidence commands, including Docker PostgreSQL/Redis prerequisites when required.
- [x] 3.3 Map each evidence command back to requirement areas and pass criteria instead of listing raw test file names only.
- [x] 3.4 Record tests that are intentionally not run automatically and explain why.

## 4. Manual Checklist

- [x] 4.1 Add manual MoMo sandbox checklist covering env, public tunnel, order creation, payment initiation, provider redirect, user completion/cancel, IPN, order/payment status, and ticket issuance.
- [x] 4.2 Add manual VNPay sandbox checklist covering env, IPN URL setup, signed payment URL, gateway payment, return result, authoritative IPN, order/payment status, and ticket issuance.
- [x] 4.3 Add manual external email checklist for Gmail/Maildev purchase confirmation delivery, ticket details, QR attachment or inline QR presence, and retry/failure behavior.
- [x] 4.4 Add manual frontend UX checklist for audience purchase, ticket wallet/QR display, organizer/admin flows, responsive review, and payment error/cancel states.
- [x] 4.5 Add manual mobile/offline check-in checklist for emulator/device scan, offline queue, sync, duplicate/conflict behavior, or mark the area as a gap if mobile support is unavailable.

## 5. Gap Handling

- [x] 5.1 For every failed or uncovered requirement, decide whether it is missing test evidence, manual-only evidence, or an actual feature gap.
- [x] 5.2 Stop and report before changing business behavior to satisfy a failing requirement.
- [x] 5.3 Create recommended follow-up change names for actual feature gaps.

## 6. Verification

- [x] 6.1 Run only scoped automated evidence commands agreed for this validation change.
- [x] 6.2 Save or summarize pass/fail/manual/not-run status in the validation report.
- [x] 6.3 Run `openspec status --change "validate-submission-requirements"` and confirm all artifacts are complete.
