# project-governance Specification

## Purpose
TBD - created by archiving change define-ticketbox-blueprint. Update Purpose after archive.
## Requirements
### Requirement: Main specs define target system contract
The OpenSpec main specs SHALL represent the accepted target behavior and architecture contract for TicketBox, not proof that implementation is complete.

#### Scenario: Blueprint change is archived
- **WHEN** `define-ticketbox-blueprint` is archived into `openspec/specs/`
- **THEN** the archived specs SHALL be treated as the target system contract that future implementation changes must satisfy

#### Scenario: Main spec exists before implementation
- **WHEN** a capability exists in `openspec/specs/` before its code is implemented
- **THEN** the team SHALL NOT treat that spec as implementation-complete evidence

### Requirement: Implementation changes reference target specs
Future implementation changes SHALL reference the relevant target specs instead of redefining the same system requirements from scratch.

#### Scenario: Ticket purchase implementation change is created
- **WHEN** the team creates an implementation change for ticket purchase
- **THEN** that change SHALL reference the `ticket-purchase` target spec and define implementation tasks, tests, and code changes separately

#### Scenario: Design decision changes during implementation
- **WHEN** implementation reveals that an accepted target behavior or architecture decision must change
- **THEN** the team SHALL create or update an OpenSpec change that modifies the relevant target spec or design artifact explicitly

### Requirement: Implementation status is tracked outside target specs
The project SHALL track implementation progress through implementation changes, task checklists, tests, pull requests, and `docs/roadmap.md`, not by the mere presence of target specs.

#### Scenario: Reviewer checks whether a capability is implemented
- **WHEN** a reviewer needs to know whether a capability has been built
- **THEN** the reviewer SHALL inspect implementation changes, completed tasks, tests, pull requests, and roadmap status in addition to the target spec

#### Scenario: Target spec remains unmet
- **WHEN** a target spec exists but its implementation change is incomplete
- **THEN** the project SHALL consider the capability specified but not yet delivered

