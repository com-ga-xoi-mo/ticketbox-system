## MODIFIED Requirements

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
