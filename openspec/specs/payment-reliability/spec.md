# payment-reliability Specification

## Purpose
TBD - created by archiving change define-ticketbox-blueprint. Update Purpose after archive.
## Requirements
### Requirement: Payment gateway abstraction
The system SHALL interact with payment providers through an adapter interface that supports VNPAY/MoMo-like redirect, callback, timeout, and failure behavior.

#### Scenario: Payment URL is created
- **WHEN** a customer initiates payment for a valid pending order
- **THEN** the system SHALL create a payment attempt and return a provider redirect URL

#### Scenario: Provider failure is contained
- **WHEN** the payment provider simulator returns a failure
- **THEN** the system SHALL keep non-payment features available and mark the payment attempt appropriately

### Requirement: Idempotent checkout and payment
The system SHALL use idempotency keys and provider event identifiers to prevent duplicate orders, payment attempts, and ticket issuance.

#### Scenario: Duplicate payment initiation returns original result
- **WHEN** the same user retries payment initiation with the same idempotency key
- **THEN** the system SHALL return the original payment initiation result

#### Scenario: Duplicate callback is ignored
- **WHEN** the provider sends the same successful callback more than once
- **THEN** the system SHALL fulfill the order only once and SHALL not issue duplicate tickets

### Requirement: Circuit breaker for payment provider
The system SHALL open a circuit breaker after repeated payment provider failures and SHALL allow limited half-open recovery attempts.

#### Scenario: Circuit opens after repeated failures
- **WHEN** payment provider calls fail beyond the configured threshold
- **THEN** the system SHALL stop calling the provider temporarily and return a controlled checkout error

#### Scenario: Circuit recovers
- **WHEN** the circuit breaker is half-open and a trial payment provider call succeeds
- **THEN** the system SHALL close the circuit and resume normal payment initiation

### Requirement: Payment reconciliation
The system SHALL reconcile payment attempts that remain pending after timeout.

#### Scenario: Pending payment is reconciled
- **WHEN** a payment remains pending beyond the configured timeout
- **THEN** a worker SHALL query or simulate provider status and update the order consistently

