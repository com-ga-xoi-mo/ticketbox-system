## ADDED Requirements

### Requirement: VNPay sandbox payment integration

The system SHALL support VNPay sandbox as a payment provider alongside the local simulator and MoMo, using a signed VNPay payment URL and verified VNPay callbacks while preserving the existing payment idempotency, circuit breaker, order lifecycle, inventory, and ticket-issuance behavior.

#### Scenario: VNPay sandbox payment URL is created

- **WHEN** an authenticated customer initiates VNPay payment for their own `PENDING_PAYMENT` order
- **THEN** the system SHALL create or persist one pending payment attempt linked to that order
- **AND** the system SHALL build a VNPay 2.1.0 sandbox payment URL with the configured terminal code and a valid HMAC SHA512 secure hash
- **AND** the system SHALL send the payment amount using VNPay's amount scaling rule
- **AND** the system SHALL return the signed VNPay URL as the provider redirect URL

#### Scenario: VNPay initiation reuses payment reliability controls

- **WHEN** a customer initiates VNPay payment
- **THEN** the existing payment initiation idempotency behavior SHALL apply to the VNPay provider
- **AND** the VNPay provider SHALL use an isolated circuit breaker state
- **AND** a failure in VNPay SHALL NOT block simulator, MoMo, browsing, or other non-payment features

#### Scenario: VNPay return callback is read-only

- **WHEN** the customer browser is redirected to the configured VNPay return endpoint
- **THEN** the system SHALL verify the VNPay signature before returning a normalized result
- **AND** the return endpoint SHALL NOT mark the payment successful or transition the order to `PAID`
- **AND** the client SHALL be able to query the persisted order or payment status while awaiting authoritative IPN processing

#### Scenario: VNPay IPN with invalid signature is rejected

- **WHEN** a VNPay IPN secure hash verification fails
- **THEN** the system SHALL reject the callback without changing payment or order state
- **AND** the linked order SHALL NOT transition to `PAID`
- **AND** the system SHALL NOT issue tickets

#### Scenario: VNPay IPN identity and amount are validated

- **WHEN** a signed VNPay IPN references an unknown merchant transaction, a different terminal code, a non-VNPay payment, or an amount different from the persisted payment attempt
- **THEN** the system SHALL reject the state mutation with a provider-compatible acknowledgement
- **AND** the payment and order SHALL remain unchanged
- **AND** the system SHALL NOT issue tickets

#### Scenario: Successful VNPay IPN marks order paid

- **WHEN** VNPay sends a valid IPN for a pending VNPay payment with both response code and transaction status equal to `00`
- **THEN** the system SHALL record the verified provider event
- **AND** the system SHALL mark the payment attempt as `SUCCEEDED`
- **AND** the system SHALL transition the linked order to `PAID`
- **AND** the existing paid-order flow SHALL confirm reserved inventory and issue tickets exactly once
- **AND** the IPN endpoint SHALL return a provider-compatible success acknowledgement

#### Scenario: Failed VNPay IPN marks order failed

- **WHEN** VNPay sends a valid final IPN whose response code or transaction status is not `00`
- **THEN** the system SHALL record the verified provider event and failure details
- **AND** the system SHALL mark the payment attempt as `FAILED`
- **AND** the system SHALL transition the linked order to `FAILED`
- **AND** the existing failed-order flow SHALL release reserved inventory
- **AND** the system SHALL NOT issue tickets

#### Scenario: Duplicate VNPay IPN does not duplicate fulfillment

- **WHEN** VNPay sends the same successful IPN more than once
- **THEN** the duplicate provider event SHALL be treated as an idempotent no-op
- **AND** the payment and order outcome SHALL remain consistent
- **AND** the order SHALL NOT transition twice
- **AND** the system SHALL NOT confirm inventory or issue tickets more than once
- **AND** the IPN endpoint SHALL return a provider-compatible already-confirmed acknowledgement
