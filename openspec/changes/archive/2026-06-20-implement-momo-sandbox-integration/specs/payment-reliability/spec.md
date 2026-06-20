## ADDED Requirements

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
