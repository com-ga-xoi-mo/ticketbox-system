# payment-reliability Specification

## Purpose
TBD - created by archiving change define-ticketbox-blueprint. Update Purpose after archive.
## Requirements
### Requirement: Payment gateway abstraction
The system SHALL interact with payment providers through an adapter interface that supports VNPAY/MoMo-like redirect, callback, timeout, delayed callback, duplicate callback, and failure behavior. The default local implementation SHALL be a payment simulator suitable for deterministic backend and Postman testing.

#### Scenario: Payment URL is created
- **WHEN** a customer initiates payment for a valid pending order
- **THEN** the system SHALL create a payment attempt and return a provider redirect URL

#### Scenario: Simulator payment URL is created
- **WHEN** an authenticated customer initiates simulator payment for their own `PENDING_PAYMENT` order
- **THEN** the system SHALL persist a pending payment attempt linked to that order
- **AND** the system SHALL return a local simulator redirect URL for choosing or triggering the provider outcome

#### Scenario: Successful simulator callback marks order paid
- **WHEN** the simulator sends a valid successful callback for a pending payment attempt
- **THEN** the system SHALL mark the payment attempt as successful
- **AND** the system SHALL transition the linked order to `PAID`
- **AND** the order paid flow SHALL issue tickets through the existing ticket issuance behavior

#### Scenario: Provider failure is contained
- **WHEN** the payment provider simulator returns a failure
- **THEN** the system SHALL keep non-payment features available and mark the payment attempt appropriately

#### Scenario: Failed simulator callback marks order failed
- **WHEN** the simulator sends a valid failed callback for a pending payment attempt
- **THEN** the system SHALL mark the payment attempt as failed
- **AND** the system SHALL transition the linked order to `FAILED`
- **AND** the system SHALL NOT issue tickets for that order

#### Scenario: Timeout simulator outcome remains pending
- **WHEN** the simulator payment outcome is timeout and no final provider callback is delivered
- **THEN** the system SHALL leave the payment attempt pending
- **AND** the linked order SHALL remain `PENDING_PAYMENT` until reservation expiration or later reconciliation handles it

#### Scenario: Delayed simulator callback updates later
- **WHEN** the simulator delays a final callback for a pending payment attempt
- **THEN** the system SHALL keep the payment attempt pending before the callback arrives
- **AND** the system SHALL apply the final success or failure outcome when the delayed callback is delivered

#### Scenario: Duplicate simulator callback does not duplicate fulfillment
- **WHEN** the simulator sends the same successful callback for a payment attempt more than once
- **THEN** the system SHALL keep the payment/order outcome consistent
- **AND** the system SHALL NOT issue duplicate tickets

### Requirement: MoMo sandbox payment integration
The system SHALL support MoMo sandbox as a real payment provider adapter alongside the local simulator, using signed MoMo requests and verified MoMo IPN callbacks.

#### Scenario: MoMo sandbox payment URL is created
- **WHEN** an authenticated customer initiates MoMo payment for their own `PENDING_PAYMENT` order
- **THEN** the system SHALL create or persist a pending payment attempt linked to that order
- **AND** the system SHALL call the configured MoMo sandbox create-payment endpoint with a valid HMAC SHA256 signature
- **AND** the system SHALL return the MoMo `payUrl` as the provider redirect URL
- **AND** the system SHALL expose the MoMo `deeplink` when MoMo returns one

#### Scenario: MoMo IPN with invalid signature is rejected
- **WHEN** MoMo IPN payload signature verification fails
- **THEN** the system SHALL reject the callback without marking the payment successful
- **AND** the linked order SHALL NOT transition to `PAID`
- **AND** the system SHALL NOT issue tickets for that order

#### Scenario: Successful MoMo IPN marks order paid
- **WHEN** MoMo sends a valid successful IPN callback for a pending payment attempt
- **THEN** the system SHALL mark the payment attempt as successful
- **AND** the system SHALL transition the linked order to `PAID`
- **AND** the order paid flow SHALL issue tickets through the existing ticket issuance behavior

#### Scenario: Failed MoMo IPN marks order failed
- **WHEN** MoMo sends a valid failed IPN callback for a pending payment attempt
- **THEN** the system SHALL mark the payment attempt as failed with provider failure details
- **AND** the system SHALL transition the linked order to `FAILED`
- **AND** the system SHALL NOT issue tickets for that order

#### Scenario: Duplicate MoMo IPN does not duplicate fulfillment
- **WHEN** MoMo sends the same successful IPN callback for a payment attempt more than once
- **THEN** the system SHALL keep the payment/order outcome consistent
- **AND** the system SHALL NOT issue duplicate tickets
- **AND** the duplicate provider event SHALL be treated as an idempotent no-op

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

### Requirement: Circuit breaker for payment provider
The system SHALL open a Redis-backed circuit breaker after repeated payment provider failures or timeouts and SHALL allow limited half-open recovery attempts without affecting non-payment features.

#### Scenario: Circuit opens after repeated failures
- **WHEN** payment provider initiation calls fail beyond the configured threshold
- **THEN** the system SHALL mark that provider circuit as `OPEN`
- **AND** the system SHALL record an open cooldown window in Redis

#### Scenario: Open circuit blocks provider calls
- **WHEN** an authenticated customer initiates payment while the selected provider circuit is `OPEN`
- **THEN** the system SHALL reject the payment initiation with a controlled payment degradation error
- **AND** the system SHALL NOT call the payment provider
- **AND** non-payment features SHALL remain available

#### Scenario: Circuit enters half-open after cooldown
- **WHEN** the provider circuit open cooldown has elapsed
- **THEN** the system SHALL allow only the configured number of `HALF_OPEN` trial payment initiation calls
- **AND** additional trial requests SHALL receive a controlled payment degradation error without calling the provider

#### Scenario: Circuit recovers
- **WHEN** the circuit breaker is `HALF_OPEN` and a trial payment provider call succeeds
- **THEN** the system SHALL close the circuit
- **AND** normal payment initiation SHALL resume for that provider

#### Scenario: Half-open failure reopens circuit
- **WHEN** the circuit breaker is `HALF_OPEN` and a trial payment provider call fails or times out
- **THEN** the system SHALL reopen the circuit
- **AND** the system SHALL start a new open cooldown window

#### Scenario: Provider circuits are isolated
- **WHEN** one payment provider circuit is `OPEN`
- **THEN** payment initiation for a different provider SHALL use that provider's own circuit state
- **AND** the open provider SHALL NOT block other providers

### Requirement: Payment reconciliation
The system SHALL reconcile payment attempts that remain pending after timeout.

#### Scenario: Pending payment is reconciled
- **WHEN** a payment remains pending beyond the configured timeout
- **THEN** a worker SHALL query or simulate provider status and update the order consistently

