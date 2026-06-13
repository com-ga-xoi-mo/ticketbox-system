## 1. Review Blueprint Source

- [x] 1.1 Review `docs/requirements.md` and confirm all required blueprint sections are represented
- [x] 1.2 Review `proposal.md` for problem, goals, users, scope, non-goals, risks, and constraints
- [x] 1.3 Review `design.md` for architecture, C4 diagrams, database design, RBAC, business flows, and protection mechanisms
- [x] 1.4 Review all `specs/*/spec.md` files for complete capability coverage and testable scenarios

## 2. Prepare Course Blueprint Artifact

- [x] 2.1 Create `blueprint/proposal.md` from the OpenSpec proposal
- [x] 2.2 Create `blueprint/design.md` from the OpenSpec design
- [x] 2.3 Create `blueprint/specs/auth.md` from `specs/identity-access/spec.md`
- [x] 2.4 Create `blueprint/specs/concert.md` from `specs/concert-management/spec.md`
- [x] 2.5 Create `blueprint/specs/ticketing.md` from `specs/ticket-purchase/spec.md`
- [x] 2.6 Create `blueprint/specs/payment.md` from `specs/payment-reliability/spec.md`
- [x] 2.7 Create `blueprint/specs/notification.md` from `specs/notification-delivery/spec.md`
- [x] 2.8 Create `blueprint/specs/checkin.md` from `specs/checkin-offline-sync/spec.md`
- [x] 2.9 Create `blueprint/specs/guest-list.md` from `specs/guest-list-import/spec.md`
- [x] 2.10 Create `blueprint/specs/ai-bio.md` from `specs/ai-artist-bio/spec.md`
- [x] 2.11 Create `blueprint/specs/platform-protection.md` from `specs/platform-protection/spec.md`
- [x] 2.12 Create `blueprint/specs/submission-readiness.md` from `specs/submission-readiness/spec.md`
- [x] 2.13 Create `blueprint/specs/project-governance.md` from `specs/project-governance/spec.md`

## 3. Add Team Roadmap Reference

- [x] 3.1 Move the 5-week implementation roadmap into `docs/roadmap.md`
- [x] 3.2 Link or reference `docs/roadmap.md` from the blueprint design where implementation planning is discussed

## 4. Validate and Final Review

- [x] 4.1 Run `openspec validate define-ticketbox-blueprint`
- [x] 4.2 Check that `blueprint/` matches the required submission structure in `docs/requirements.md`
- [x] 4.3 Check that every required technical mechanism is covered: rate limiting, circuit breaker, idempotency, caching, concurrency-safe inventory, per-user limit, offline check-in, CSV import, and AI bio
- [x] 4.4 Mark the blueprint change ready for team review

## 5. Archive Semantics Clarification

- [x] 5.1 Add `project-governance` capability to the proposal
- [x] 5.2 Add project governance spec explaining that archived specs are target contracts, not implementation-complete evidence
- [x] 5.3 Add `Spec Semantics` section to OpenSpec and course blueprint design documents
- [x] 5.4 Validate the change remains suitable for normal archive without `--skip-specs`
