## MODIFIED Requirements

### Requirement: Per-user ticket limit
The system SHALL enforce the configured maximum tickets per user per ticket type across paid orders and active, unexpired reservations. The limit check SHALL run during checkout before payment and SHALL reject a request when the user's existing paid quantity plus active reserved quantity plus requested quantity would exceed `ticket_types.max_per_user`.

#### Scenario: User reaches SVIP limit
- **WHEN** a user who already has 2 paid SVIP tickets requests 1 more SVIP ticket for a ticket type with max 2 per user
- **THEN** the system SHALL reject the checkout request before payment

#### Scenario: Active reservation counts toward user limit
- **WHEN** a user has 1 paid ticket and 1 active `PENDING_PAYMENT` reservation for a ticket type with max 2 per user
- **THEN** the system SHALL reject a checkout request for 1 additional ticket of that ticket type before creating a new order

#### Scenario: Expired reservation does not count toward user limit
- **WHEN** a user has a `PENDING_PAYMENT` reservation whose `reservationExpiresAt` is in the past for a ticket type with max 2 per user
- **THEN** the system SHALL not count that expired reservation against a new checkout request for that ticket type

#### Scenario: Duplicate checkout does not consume the limit twice
- **WHEN** a user resubmits the same checkout request with the same idempotency key
- **THEN** the system SHALL return the existing order and SHALL NOT count the same order items as a second requested purchase

#### Scenario: Concurrent user requests cannot bypass limit
- **WHEN** the same user sends concurrent checkout requests for the same limited ticket type
- **THEN** the system SHALL accept only the quantity that keeps the user within the configured limit
