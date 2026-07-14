## ADDED Requirements

### Requirement: Online assignment-bound VIP lookup

The check-in mobile app SHALL provide an online-only VIP lookup tab that uses the exact selected assignment and the shared VIP lookup request/response contract, and SHALL keep the workflow separate from QR scanning, ticket cache, and offline synchronization.

#### Scenario: Assigned staff finds an active VIP

- **WHEN** authenticated CHECKIN_STAFF with a selected active assignment searches by email, phone, or external reference while online and the backend returns `found`
- **THEN** the app SHALL display the matching guest name and available identifiers for that assignment's concert and gate

#### Scenario: Unknown or cancelled VIP is not found

- **WHEN** the shared lookup response is `not_found`
- **THEN** the app SHALL show a non-success result without presenting inactive guest data as valid

#### Scenario: Request derives selected assignment context

- **WHEN** staff submits the VIP form
- **THEN** the client SHALL derive `assignmentId`, `concertId`, and available gate context from the current selected assignment and SHALL allow the user to supply only lookup type and value

#### Scenario: Assignment authorization failure is explicit

- **WHEN** the backend rejects the selected assignment because it is missing, revoked, belongs to another staff member, concert, or gate
- **THEN** the app SHALL display an authorization-specific error and SHALL NOT retry using another assignment implicitly

#### Scenario: Offline lookup is disabled

- **WHEN** the network monitor reports that the device is offline
- **THEN** the app SHALL disable VIP submission, explain that an online connection is required, and SHALL NOT enqueue or cache the request

#### Scenario: Transport and invalid response failures remain recoverable

- **WHEN** VIP lookup times out, loses transport, returns a service error, or violates the shared response schema
- **THEN** the app SHALL leave QR scanning and sync available and SHALL present a recoverable error for a later online retry

#### Scenario: QR scan behavior remains independent

- **WHEN** the VIP tab is added
- **THEN** decoded QR payloads, online scan submission, offline scan queueing, ticket cache lookup, and batch sync SHALL retain their existing behavior
