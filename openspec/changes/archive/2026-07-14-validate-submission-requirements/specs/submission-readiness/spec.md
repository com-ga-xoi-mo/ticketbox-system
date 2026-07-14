## ADDED Requirements

### Requirement: Comprehensive requirement validation evidence
The project SHALL maintain a final validation matrix that maps each required course problem area to implementation locations, automated evidence, manual evidence, current status, and pass criteria. The matrix SHALL explicitly cover ticket contention/no-oversell, traffic spike protection, payment instability, duplicate payment prevention, offline check-in, one-way CSV guest-list import, per-user ticket limits, public catalog caching, notification delivery, AI artist bio, RBAC, local setup, seed data, and demo readiness.

#### Scenario: Validation matrix maps required problem areas
- **WHEN** the team prepares final submission evidence
- **THEN** the validation matrix SHALL list every required problem area from `docs/requirements.md`
- **AND** each row SHALL identify the related OpenSpec capability, code or test area, evidence type, expected pass criteria, and current status

#### Scenario: Missing coverage is recorded as a gap
- **WHEN** a required problem area lacks implementation, automated evidence, or reliable manual evidence
- **THEN** the validation matrix SHALL mark the item as a gap
- **AND** the matrix SHALL describe the recommended follow-up change instead of implying the requirement is complete

### Requirement: Automated submission evidence
The project SHALL provide deterministic automated evidence commands or test groups for backend and platform requirements that can be verified locally without third-party interactive steps.

#### Scenario: Automated evidence covers backend invariants
- **WHEN** the team runs the documented automated evidence commands
- **THEN** the output SHALL include evidence for no-oversell concurrency, per-user limit concurrency, payment initiation idempotency, duplicate provider callback dedupe, paid-order recovery, rate limiting, circuit breaker behavior, QR ticket issuance, notification/QR email invariants, catalog caching, RBAC boundaries, and guest-list import/report behavior

#### Scenario: Automated evidence avoids false provider claims
- **WHEN** simulator-based payment tests are included in automated evidence
- **THEN** the evidence report SHALL label them as deterministic simulator coverage
- **AND** it SHALL NOT claim that simulator-only tests prove real MoMo or VNPay sandbox payment completion

#### Scenario: Automated evidence remains deterministic
- **WHEN** evidence tests run in local development or CI-like execution
- **THEN** the tests SHALL avoid long sleeps, uncontrolled external network calls, and manual browser actions
- **AND** tests requiring PostgreSQL or Redis SHALL document the required Docker services

### Requirement: Manual submission evidence checklist
The project SHALL provide a manual checklist for required flows that cannot be reliably automated by local tests or AI execution.

#### Scenario: Manual provider payment checklist exists
- **WHEN** final payment evidence is prepared
- **THEN** the checklist SHALL include MoMo and VNPay sandbox setup, order creation, payment initiation, provider redirect, user completion or cancellation, return URL observation, IPN/public tunnel verification, order/payment status verification, and ticket issuance verification

#### Scenario: Manual external delivery checklist exists
- **WHEN** final notification evidence is prepared
- **THEN** the checklist SHALL include email delivery to an external inbox or Maildev fallback, purchase confirmation content, QR attachment or inline QR presence, and retry/failure behavior evidence

#### Scenario: Manual UI and device checklist exists
- **WHEN** final demo evidence is prepared
- **THEN** the checklist SHALL include audience web purchase flow, ticket wallet/QR display, organizer/admin management flow, check-in staff flow, offline/mobile sync flow if available, responsive frontend review, and known UX limitations

### Requirement: Submission evidence report
The project SHALL produce a reviewer-facing validation report summarizing automated pass/fail results, manual checklist status, known limitations, required environment variables, and setup prerequisites.

#### Scenario: Evidence report summarizes results
- **WHEN** the validation change is completed
- **THEN** the report SHALL summarize which evidence groups passed, failed, were not run, or require manual verification
- **AND** failures SHALL identify the requirement area affected rather than only showing raw test output

#### Scenario: Evidence report documents prerequisites
- **WHEN** a reviewer or teammate reads the validation report
- **THEN** it SHALL identify required local services, seed data, provider sandbox credentials, public tunnel requirements, and manual accounts needed to reproduce the evidence
