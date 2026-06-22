## MODIFIED Requirements

### Requirement: Idempotent checkout and payment
The system SHALL use idempotency keys and provider event identifiers to prevent duplicate orders, duplicate payment attempts, and duplicate ticket issuance.

#### Scenario: Duplicate payment initiation returns original result
- **WHEN** the same authenticated user retries payment initiation for the same order, provider, and idempotency key
- **THEN** the system SHALL return the original payment initiation result
- **AND** the system SHALL NOT create a second payment attempt
- **AND** the system SHALL NOT call the payment provider a second time

#### Scenario: Payment initiation key reuse with different request is rejected
- **WHEN** the same authenticated user reuses a payment initiation idempotency key with a different order or provider
- **THEN** the system SHALL reject the request with a conflict error
- **AND** the system SHALL NOT create a new payment attempt
- **AND** the system SHALL NOT call the payment provider

#### Scenario: Concurrent payment initiation creates one attempt
- **WHEN** two payment initiation requests with the same user, order, provider, and idempotency key are processed concurrently
- **THEN** at most one request SHALL create the payment attempt and provider session
- **AND** the other request SHALL either receive the stored original result or a controlled in-progress conflict
- **AND** no second provider transaction SHALL be created for that idempotency key

#### Scenario: Idempotency is isolated by provider
- **WHEN** the same authenticated user initiates payment for the same order with different providers using different idempotency keys
- **THEN** the system SHALL treat those payment initiation operations as distinct
- **AND** provider-specific retries SHALL only replay the matching provider response

#### Scenario: Duplicate callback is ignored
- **WHEN** the provider sends the same successful callback more than once
- **THEN** the system SHALL fulfill the order only once and SHALL not issue duplicate tickets
