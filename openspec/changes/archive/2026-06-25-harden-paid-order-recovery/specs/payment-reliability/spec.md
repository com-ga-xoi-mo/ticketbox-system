## ADDED Requirements

### Requirement: Successful payment fulfillment recovery
The system SHALL provide a shared idempotent finalization use case and an internal repair worker for payments that are already known to be successful while linked order or ticket fulfillment is incomplete. Provider callbacks, repair jobs, and future internal recovery tools SHALL use the same finalization behavior.

#### Scenario: Initial successful callback fails after payment persistence
- **WHEN** a verified successful provider callback persists the payment as `SUCCEEDED` but order or ticket finalization fails before fulfillment completes
- **THEN** the successful payment SHALL remain persisted
- **AND** the incomplete order SHALL be eligible for internal repair
- **AND** the failure SHALL be reported without changing the payment back to pending or failed

#### Scenario: Duplicate successful callback rescues incomplete fulfillment
- **WHEN** a valid duplicate or late successful callback arrives for a `SUCCEEDED` payment whose order is not fully paid and ticketed
- **THEN** the system SHALL treat the provider event itself as duplicate
- **AND** the system SHALL invoke the shared successful-payment finalization behavior
- **AND** it SHALL NOT create a duplicate payment event, inventory transition, or ticket

#### Scenario: Duplicate successful callback is a no-op after completion
- **WHEN** a valid duplicate successful callback arrives for a `SUCCEEDED` payment whose order is `PAID` and has all expected tickets
- **THEN** the system SHALL return an idempotent already-confirmed acknowledgement
- **AND** it SHALL perform no additional fulfillment writes

#### Scenario: Repair worker completes an eligible inconsistent payment
- **WHEN** the repair worker scans a `SUCCEEDED` payment linked to a `PENDING_PAYMENT` order or incomplete paid-order ticket issuance
- **THEN** it SHALL invoke the shared successful-payment finalization behavior
- **AND** it SHALL complete all safe missing fulfillment steps
- **AND** it SHALL record a completed, already-complete, retryable, or terminal outcome

#### Scenario: Concurrent callback and repair do not duplicate fulfillment
- **WHEN** a provider callback and repair worker concurrently finalize the same successful payment
- **THEN** PostgreSQL serialization SHALL allow only one effective order and inventory transition
- **AND** the final ticket count SHALL equal the purchased quantity
- **AND** no duplicate tickets SHALL be issued

#### Scenario: Repair does not query the provider
- **WHEN** the repair worker processes a payment already persisted as `SUCCEEDED`
- **THEN** it SHALL use internal database state and SHALL NOT call the external payment provider
