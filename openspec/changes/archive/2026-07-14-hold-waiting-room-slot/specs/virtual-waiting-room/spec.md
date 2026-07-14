## MODIFIED Requirements

### Requirement: Bounded admission issues short-lived admission tokens
The system SHALL admit waiting users so that at most the configured maximum concurrency are admitted at once. When an admitted user's admission token expires, the user's pending order is finalized (paid, cancelled, or expired), or the user explicitly leaves, the freed slot SHALL be given to the next waiting user, who SHALL receive a short-lived admission token bound to that user and concert. When an admitted user creates a pending order, the system SHALL consume their admission token (preventing reuse) but SHALL NOT release their concurrency slot, extending their expiry in the active concurrency pool to match the order's reservation TTL.

#### Scenario: Admission respects the concurrency cap
- **WHEN** the number of currently admitted users is below the maximum concurrency and the queue is non-empty
- **THEN** the system SHALL admit the earliest waiting users up to the maximum concurrency and SHALL issue each an admission token

#### Scenario: Expired admission frees a slot
- **WHEN** an admitted user's admission token expires
- **THEN** the system SHALL reclaim that slot and SHALL admit the next waiting user

#### Scenario: Admission token is bound to the user and concert
- **WHEN** the system issues an admission token
- **THEN** the token SHALL be bound to the admitted user and concert and SHALL carry a bounded expiry

#### Scenario: Admission token can be looked up for the admitted user
- **WHEN** a user is admitted
- **THEN** the system SHALL expose the user's admitted status and admission token through the user's waiting-room status or stream without exposing other users' tokens

#### Scenario: Admission is idempotent under concurrent runs
- **WHEN** the admit routine runs concurrently for the same concert
- **THEN** the system SHALL NOT admit more users than the maximum concurrency and SHALL NOT issue duplicate tokens for one slot

#### Scenario: Admission token is consumed but slot is held during checkout
- **WHEN** an admitted user creates a pending order (checkout starts)
- **THEN** the system SHALL consume their admission token to prevent duplicate checkouts
- **AND** the system SHALL extend their expiry in the concurrency pool to match the order's TTL
- **AND** the user SHALL continue to be counted towards the maximum concurrency limit

#### Scenario: Finalized order frees an admission slot
- **WHEN** a user's pending order is paid, cancelled, or expires
- **THEN** the system SHALL release their waiting room slot and SHALL admit the next waiting user
