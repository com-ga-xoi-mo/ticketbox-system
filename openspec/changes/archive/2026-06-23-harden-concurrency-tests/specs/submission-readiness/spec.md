## ADDED Requirements

### Requirement: Member 3 technical evidence is runnable
The project SHALL provide reviewer-facing commands or documentation for running Member 3 hardening evidence around ticket purchase, payment reliability, and rate limiting.

#### Scenario: Hardening evidence command is documented
- **WHEN** a reviewer inspects the project test documentation or hardening evidence script
- **THEN** it SHALL identify commands for no-oversell, per-user limit, payment idempotency, duplicate callback, circuit breaker, and rate-limit tests

#### Scenario: Hardening evidence output maps to required mechanisms
- **WHEN** the team runs the documented hardening commands
- **THEN** the output SHALL make it clear which required mechanism each test group proves
- **AND** failures SHALL identify the affected mechanism rather than requiring manual log inspection

#### Scenario: Evidence remains scoped to implemented backend mechanisms
- **WHEN** hardening evidence is prepared for final submission
- **THEN** it SHALL focus on backend ticketing, payment, and platform-protection mechanisms owned by Member 3
- **AND** it SHALL NOT claim completion of unrelated frontend, offline sync, reminder, or reconciliation features
