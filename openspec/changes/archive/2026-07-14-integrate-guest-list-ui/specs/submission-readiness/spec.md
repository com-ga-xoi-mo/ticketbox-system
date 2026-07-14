## ADDED Requirements

### Requirement: Guest-list user-flow evidence

The project SHALL provide repeatable automated and manual evidence for Admin CSV upload through canonical processing/reporting and for assignment-authorized mobile VIP lookup while identifying scheduled inbox discovery as an independently operating worker flow.

#### Scenario: Automated guest-list UI evidence is runnable

- **WHEN** the documented focused and end-to-end guest-list commands are run with required local dependencies
- **THEN** they SHALL verify strict contracts, safe public mapping, client file validation, batch polling termination, report rendering, online mobile lookup, authorization, same-file idempotency, and invalid-header atomicity

#### Scenario: Manual demo covers the connected workflow

- **WHEN** the team follows the guest-list manual demo checklist
- **THEN** the evidence SHALL show an ADMIN uploading the canonical CSV template, observing processing and terminal counters, inspecting row errors, re-uploading idempotently, and assigned CHECKIN_STAFF finding the imported active guest on mobile

#### Scenario: Scheduled integration is demonstrated separately

- **WHEN** the team demonstrates the one-way sponsor integration requirement
- **THEN** it SHALL place a CSV under `data/guest-list-inbox/<concertId>/*.csv`, show the worker discovering it according to configuration, and SHALL NOT depend on a manual discovery button in the UI

#### Scenario: Missing end-to-end evidence is reported honestly

- **WHEN** PostgreSQL, Redis, worker, emulator/device, or another required dependency prevents a full evidence run
- **THEN** the submission report SHALL distinguish passing focused tests from the blocked manual or end-to-end step and SHALL NOT claim complete demo readiness
