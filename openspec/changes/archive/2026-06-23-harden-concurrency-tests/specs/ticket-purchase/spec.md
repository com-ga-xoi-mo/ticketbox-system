## ADDED Requirements

### Requirement: Ticket purchase concurrency hardening evidence
The system SHALL provide automated hardening tests or scripts proving that checkout concurrency preserves inventory correctness and per-user ticket limits.

#### Scenario: Last tickets cannot be oversold under concurrent checkout
- **WHEN** multiple authenticated audience checkout attempts concurrently reserve the last available tickets for the same ticket type
- **THEN** only requests within the remaining available inventory SHALL create `PENDING_PAYMENT` orders
- **AND** `sold_quantity + reserved_quantity` SHALL NOT exceed `total_quantity`
- **AND** rejected requests SHALL report a controlled availability error

#### Scenario: Same user cannot bypass max per user under concurrent checkout
- **WHEN** the same authenticated audience user concurrently submits checkout requests whose combined quantity exceeds `max_per_user` for a ticket type
- **THEN** only requests within the allowed per-user quantity SHALL create active reservations or paid orders
- **AND** the user's paid plus active pending quantity for that ticket type SHALL NOT exceed `max_per_user`
- **AND** rejected requests SHALL report a controlled per-user limit error

#### Scenario: Checkout concurrency test uses the transactional reservation path
- **WHEN** the hardening test exercises checkout concurrency
- **THEN** it SHALL use the same inventory reservation transaction path as production checkout rather than a mocked counter-only shortcut

