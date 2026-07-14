## MODIFIED Requirements

### Requirement: Organizer configures a presale lottery for a ticket type
The system SHALL allow an authorized organizer to enable a presale lottery on a primary-sale ticket type by configuring a registration window, a draw time, and a lottery allocation. The system SHALL reject a configuration whose timestamps are incoherent or whose allocation exceeds available primary inventory. The lottery SHALL NOT configure any per-winner entitlement TTL, because winners buy across the whole presale window rather than within a personal countdown.

#### Scenario: Organizer enables a lottery
- **WHEN** an authorized organizer configures a lottery on a primary-sale ticket type with `registrationOpensAt`, `registrationClosesAt`, `drawAt`, and `allocation`
- **THEN** the system SHALL create a lottery configuration in `SCHEDULED` status bound to that ticket type
- **AND** the system SHALL record a presale gate window on the ticket type so checkout is gated for the entire presale, from the start of the ticket's sale (`saleStartsAt`) until public sale starts (`publicSaleStartsAt`)

#### Scenario: Non-winner cannot buy during the presale before the draw
- **WHEN** a lottery is configured and its presale gate window is open but the draw has not run yet
- **THEN** direct checkout for that ticket type SHALL be rejected for every user, because the presale is gated from the start of sale and no winner has been selected yet

#### Scenario: Manual early draw does not open the sale to non-winners
- **WHEN** an organizer runs the draw early before `drawAt` via manual draw
- **THEN** the draw SHALL record winners without changing the presale gate window
- **AND** non-winners SHALL remain blocked from direct checkout for the whole presale, while winners MAY check out as winners

#### Scenario: Reconfigure after cancel is allowed
- **WHEN** an organizer configures a lottery on a ticket type whose existing lottery configuration is `CANCELLED`
- **THEN** the system SHALL reset the configuration to `SCHEDULED` with the new settings and re-record the presale gate window

#### Scenario: Reconfigure after draw is rejected
- **WHEN** an organizer attempts to configure a lottery on a ticket type whose configuration is `DRAWING` or `COMPLETED`
- **THEN** the system SHALL reject the request and SHALL NOT alter the existing configuration or its draw outcome

#### Scenario: Cancelling a lottery clears the gate window
- **WHEN** an authorized organizer cancels a `SCHEDULED` lottery configuration
- **THEN** the system SHALL clear the presale gate window on the ticket type so checkout is no longer lottery-gated

#### Scenario: Incoherent window is rejected
- **WHEN** an organizer submits a lottery configuration where `registrationOpensAt` is not before `registrationClosesAt`, or `registrationClosesAt` is not before or equal to `drawAt`, or `drawAt` is not before the public sale start
- **THEN** the system SHALL reject the configuration without creating a lottery

#### Scenario: Allocation exceeding inventory is rejected
- **WHEN** an organizer submits a lottery `allocation` greater than the ticket type's available primary inventory
- **THEN** the system SHALL reject the configuration

#### Scenario: Lottery applies only to primary-sale ticket types
- **WHEN** a request attempts to configure a lottery for a resale listing or a non-primary-sale source
- **THEN** the system SHALL reject the request because presale lottery applies only to primary-sale ticket types

### Requirement: Draw selects winners fairly and deterministically
The system SHALL run the lottery draw at `drawAt` and select winners from `REGISTERED` registrations using a recorded seed so that the same seed and registrant set always yield the same winners. The draw SHALL select winners in the deterministic order until the lottery `allocation` of ticket units is exhausted, respecting each registrant's desired quantity and remaining `max_per_user` allowance. For each winner the draw SHALL record the won quantity on the registration and SHALL NOT create any purchase entitlement, reserve inventory, or mutate `ticket_types.reserved_quantity` or `ticket_types.sold_quantity`.

#### Scenario: Draw selects winners up to allocation
- **WHEN** the draw worker runs for a ticket type with more requested ticket units than the `allocation`
- **THEN** the system SHALL select winners in deterministic order until the `allocation` is exhausted and SHALL mark the remaining registrations `NOT_SELECTED`

#### Scenario: Draw is deterministic for a recorded seed
- **WHEN** the draw is re-run with the same recorded seed and the same registrant snapshot
- **THEN** the system SHALL select the same winners in the same order

#### Scenario: Draw respects per-user allowance
- **WHEN** a winning registration's desired quantity exceeds the user's remaining `max_per_user` allowance
- **THEN** the system SHALL record a won quantity of at most the remaining allowance

#### Scenario: Draw does not reserve inventory
- **WHEN** the draw selects winners
- **THEN** the system SHALL NOT increment `reserved_quantity` and SHALL NOT decrement available inventory except through the existing checkout reservation transaction

#### Scenario: Draw does not select beyond available inventory
- **WHEN** the draw evaluates how many ticket units to award
- **THEN** it SHALL award at most the smaller of the configured `allocation` and the available primary inventory

#### Scenario: Draw is idempotent
- **WHEN** the draw worker runs more than once for a lottery already in `COMPLETED` status
- **THEN** the system SHALL NOT award additional winners or re-select winners

#### Scenario: Withdrawn registrations are excluded
- **WHEN** the draw selects winners
- **THEN** the system SHALL skip `WITHDRAWN` registrations

### Requirement: Organizer can run a draw manually
The system SHALL allow an authorized organizer or admin to trigger a `SCHEDULED` lottery draw immediately. Manual draw SHALL use the same deterministic draw use case, lock, audit record, winner-recording logic, and notification behavior as the scheduled worker.

#### Scenario: Organizer runs draw now
- **WHEN** an authorized organizer triggers manual draw for a `SCHEDULED` lottery
- **THEN** the system SHALL run the same draw logic used by the scheduled worker
- **AND** the system SHALL return won and not-selected counts
- **AND** the system SHALL persist the same draw audit record and winner/non-winner status changes

#### Scenario: Manual draw is idempotent after completion
- **WHEN** an authorized organizer triggers manual draw for a lottery already in `COMPLETED` status
- **THEN** the system SHALL NOT award additional winners or change the recorded outcome
- **AND** the system SHALL return a no-op result

#### Scenario: Manual draw rejects unauthorized user
- **WHEN** a non-organizer audience user triggers manual draw
- **THEN** the system SHALL reject the request before running the draw

### Requirement: Lottery registration status is visible to the audience user
The system SHALL expose the authenticated user's lottery status for a ticket type, including registration status and draw status. For a winner the status SHALL include the won quantity and how much of it has already been purchased; it SHALL NOT include any purchase entitlement or expiry, because winners buy across the whole presale window.

#### Scenario: Registered user sees pending status
- **WHEN** an authenticated user requests lottery status for a ticket type where they have a `REGISTERED` entry and the draw has not run
- **THEN** the system SHALL return the registration status and the scheduled draw time

#### Scenario: Winner sees remaining purchasable quantity
- **WHEN** an authenticated user requests lottery status after the draw selected them
- **THEN** the system SHALL return the `WON` status, the won quantity, and the remaining quantity they may still purchase during the presale window

#### Scenario: Non-winner sees not-selected status
- **WHEN** an authenticated user requests lottery status after the draw did not select them
- **THEN** the system SHALL return the `NOT_SELECTED` status

### Requirement: Organizer can inspect lottery registrations
The system SHALL allow an authorized organizer or admin to list registrations for a lottery-enabled ticket type, including user identity, requested quantity, registration status, timestamps, and winner outcome (won quantity and purchased quantity).

#### Scenario: Organizer views registration list
- **WHEN** an authorized organizer requests the registration list for a configured lottery ticket type
- **THEN** the system SHALL return registrations ordered by registration time
- **AND** each row SHALL include user display name, email, desired quantity, status, registered time, result timestamps, and for winners the won and purchased quantities

#### Scenario: Registration list rejects unauthorized user
- **WHEN** a non-organizer audience user requests the registration list
- **THEN** the system SHALL reject the request

### Requirement: Lottery draw notifies registrants
The system SHALL create an in-app notification and enqueue an email notification for each winner when the draw records them, and SHALL notify non-winners that they were not selected. Winner notifications SHALL tell the winner they may buy during the presale window and SHALL include an action URL to the relevant checkout flow; they SHALL NOT reference a reserved slot or an expiry countdown.

#### Scenario: Winner receives win notification
- **WHEN** the draw records a user as a winner
- **THEN** the system SHALL persist an in-app notification telling the user they may buy during the presale window with an action URL
- **AND** the action URL SHALL use the audience event slug rather than the internal concert identifier

#### Scenario: Winner receives win email
- **WHEN** the draw records a winner with an email address
- **THEN** the system SHALL enqueue an email notification containing the concert name, ticket type, won quantity, and action URL
- **AND** the email subject and body SHALL use Vietnamese text with proper diacritics
- **AND** the email delivery queue job SHALL use a BullMQ-safe custom job ID and configured retry/backoff options
- **AND** the content SHALL NOT reference a reserved slot or a personal expiry countdown

#### Scenario: Non-winner receives not-selected notification
- **WHEN** the draw marks a registration `NOT_SELECTED`
- **THEN** the system SHALL notify that user that they were not selected in the draw

#### Scenario: Notification failure does not roll back the draw
- **WHEN** notification creation fails after the draw records winners
- **THEN** the draw outcome SHALL remain and the failure SHALL be reported for retry or investigation

## ADDED Requirements

### Requirement: Lottery winners buy across the whole presale window
The system SHALL allow a lottery winner to purchase up to their won quantity at any time during the presale gate window (from the draw until `publicSaleStartsAt`), with no per-winner slot or expiry. The system SHALL track each winner's purchased quantity and SHALL prevent a winner from purchasing more than their won quantity across one or more orders. Enforcement SHALL be atomic with the reservation transaction.

#### Scenario: Winner buys any time during the presale window
- **WHEN** a winner submits checkout for the won ticket type at any point while the presale gate window is open
- **THEN** the system SHALL allow the purchase up to the winner's remaining won quantity

#### Scenario: Winner cannot exceed their won quantity
- **WHEN** a winner attempts to buy more than their remaining won quantity, in one order or across multiple orders
- **THEN** the system SHALL reject the excess before creating an order or reserving inventory

#### Scenario: Purchased quantity is recorded atomically
- **WHEN** a winner's order is created inside the reservation transaction
- **THEN** the system SHALL increment the winner's purchased quantity in the same transaction and SHALL mark the registration fulfilled when the won quantity is fully used

#### Scenario: Winners compete only with other winners and inventory suffices
- **WHEN** all winners buy within the presale window
- **THEN** every winner SHALL be able to buy their won quantity, because total won quantity does not exceed allocation and non-winners are blocked during the window

## REMOVED Requirements

### Requirement: Winner entitlement has a bounded lifecycle
**Reason**: Winners no longer receive a per-winner purchase entitlement with a TTL/expiry; they may buy across the whole presale window, capped by their recorded won quantity.
**Migration**: Stop creating `PurchaseEntitlement source=LOTTERY`; remove the lottery entitlement TTL config and the entitlement expiry/reminder jobs. Record won and purchased quantities on `lottery_registrations` instead. Existing lottery entitlements are voided by the `purchase_entitlements` table removal; affected winners may still buy during the presale window under the new model.
