# presale-lottery Specification

## Purpose

Defines the presale lottery capability for primary-sale ticket types: organizer configuration, audience registration, deterministic draw execution, winner entitlements, notifications, and worker behavior.

## Requirements

### Requirement: Organizer configures a presale lottery for a ticket type
The system SHALL allow an authorized organizer to enable a presale lottery on a primary-sale ticket type by configuring a registration window, a draw time, a lottery allocation, and an entitlement TTL in minutes. The system SHALL reject a configuration whose timestamps are incoherent, whose allocation exceeds available primary inventory, or whose entitlement TTL is not positive.

#### Scenario: Organizer enables a lottery
- **WHEN** an authorized organizer configures a lottery on a primary-sale ticket type with `registrationOpensAt`, `registrationClosesAt`, `drawAt`, `allocation`, and optional `entitlementTtlMinutes`
- **THEN** the system SHALL create a lottery configuration in `SCHEDULED` status bound to that ticket type
- **AND** the system SHALL persist `entitlementTtlMinutes`, defaulting to 15 when omitted
- **AND** the system SHALL record a presale gate window on the ticket type so checkout is gated for the entire presale, from the start of the ticket's sale (`saleStartsAt`) until public sale starts (`publicSaleStartsAt`)

#### Scenario: Non-winner cannot buy during the presale before the draw
- **WHEN** a lottery is configured and its presale gate window is open but the draw has not run yet
- **THEN** direct checkout for that ticket type SHALL be rejected for every user, because the presale is gated from the start of sale and no one holds a winning entitlement yet

#### Scenario: Manual early draw does not open the sale to non-winners
- **WHEN** an organizer runs the draw early before `drawAt` via manual draw
- **THEN** the draw SHALL grant entitlements to winners without changing the presale gate window
- **AND** non-winners SHALL remain blocked from direct checkout for the whole presale, while winners MAY check out using their entitlement

#### Scenario: Reconfigure after cancel is allowed
- **WHEN** an organizer configures a lottery on a ticket type whose existing lottery configuration is `CANCELLED`
- **THEN** the system SHALL reset the configuration to `SCHEDULED` with the new settings and re-record the presale gate window

#### Scenario: Reconfigure after draw is rejected
- **WHEN** an organizer attempts to configure a lottery on a ticket type whose configuration is `DRAWING` or `COMPLETED`
- **THEN** the system SHALL reject the request and SHALL NOT alter the existing configuration or its draw outcome

#### Scenario: Organizer updates TTL before draw
- **WHEN** an authorized organizer updates `entitlementTtlMinutes` for a `SCHEDULED` lottery before the draw starts
- **THEN** the system SHALL persist the new TTL for future winner entitlements

#### Scenario: TTL update after draw is rejected
- **WHEN** an authorized organizer attempts to update `entitlementTtlMinutes` after the lottery is `DRAWING` or `COMPLETED`
- **THEN** the system SHALL reject the update and SHALL NOT change already-granted entitlement expiry timestamps

#### Scenario: Invalid TTL is rejected
- **WHEN** an organizer configures a lottery with `entitlementTtlMinutes` less than 1
- **THEN** the system SHALL reject the configuration without creating or updating the lottery

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

### Requirement: Audience user can register for a presale lottery
The system SHALL allow an authenticated AUDIENCE user to register for a lottery-enabled ticket type with a desired quantity while the registration window is open. Desired quantity SHALL be capped by the ticket type's `max_per_user`. The system SHALL keep at most one active registration per user per ticket type.

#### Scenario: User registers during the open window
- **WHEN** an authenticated AUDIENCE user registers for a lottery ticket type while `now` is between `registrationOpensAt` and `registrationClosesAt`
- **THEN** the system SHALL create a `REGISTERED` lottery registration for that user and ticket type with the desired quantity

#### Scenario: Registration outside the window is rejected
- **WHEN** a user attempts to register before the window opens or after it closes
- **THEN** the system SHALL reject the registration

#### Scenario: Desired quantity above per-user limit is rejected
- **WHEN** a user attempts to register for more tickets than the ticket type's remaining `max_per_user` allowance
- **THEN** the system SHALL reject the registration

#### Scenario: Duplicate active registration is rejected
- **WHEN** a user who already has an active registration for the same ticket type registers again
- **THEN** the system SHALL return the existing registration instead of creating a duplicate active registration

### Requirement: Audience user can withdraw a lottery registration
The system SHALL allow an authenticated AUDIENCE user to withdraw an active lottery registration before the draw runs.

#### Scenario: User withdraws before draw
- **WHEN** a user withdraws a `REGISTERED` registration before `drawAt`
- **THEN** the system SHALL mark the registration `WITHDRAWN` and SHALL exclude it from the draw

#### Scenario: Withdraw after draw is rejected
- **WHEN** a user attempts to withdraw after the draw has selected winners
- **THEN** the system SHALL reject the withdrawal and SHALL preserve the draw outcome

### Requirement: Lottery registration status is visible to the audience user
The system SHALL expose the authenticated user's lottery status for a ticket type, including registration status, draw status, and active winner entitlement details with expiry when granted.

#### Scenario: Registered user sees pending status
- **WHEN** an authenticated user requests lottery status for a ticket type where they have a `REGISTERED` entry and the draw has not run
- **THEN** the system SHALL return the registration status and the scheduled draw time

#### Scenario: Winner sees entitlement expiry
- **WHEN** an authenticated user requests lottery status after the draw selected them
- **THEN** the system SHALL return the `WON` status, the granted entitlement quantity, and the entitlement expiry timestamp

#### Scenario: Non-winner sees not-selected status
- **WHEN** an authenticated user requests lottery status after the draw did not select them
- **THEN** the system SHALL return the `NOT_SELECTED` status

### Requirement: Organizer can inspect lottery registrations
The system SHALL allow an authorized organizer or admin to list registrations for a lottery-enabled ticket type, including user identity, requested quantity, registration status, timestamps, and entitlement outcome summary.

#### Scenario: Organizer views registration list
- **WHEN** an authorized organizer requests the registration list for a configured lottery ticket type
- **THEN** the system SHALL return registrations ordered by registration time
- **AND** each row SHALL include user display name, email, desired quantity, status, registered time, result timestamps, fulfillment timestamp, and linked entitlement status, expiry, and order id when present

#### Scenario: Registration list rejects unauthorized user
- **WHEN** a non-organizer audience user requests the registration list
- **THEN** the system SHALL reject the request without exposing other users' registration data

### Requirement: Draw selects winners fairly and deterministically
The system SHALL run the lottery draw at `drawAt` and select winners from `REGISTERED` registrations using a recorded seed so that the same seed and registrant set always yield the same winners. The draw SHALL grant winners in the deterministic order until the lottery `allocation` of ticket units is exhausted, respecting each registrant's desired quantity and remaining `max_per_user` allowance. Granting winner entitlements SHALL NOT mutate `ticket_types.reserved_quantity` or `ticket_types.sold_quantity`.

#### Scenario: Draw selects winners up to allocation
- **WHEN** the draw worker runs for a ticket type with more requested ticket units than the `allocation`
- **THEN** the system SHALL grant winners in deterministic order until the `allocation` is exhausted and SHALL mark the remaining registrations `NOT_SELECTED`

#### Scenario: Draw is deterministic for a recorded seed
- **WHEN** the draw is re-run with the same recorded seed and the same registrant snapshot
- **THEN** the system SHALL select the same winners in the same order

#### Scenario: Draw respects per-user allowance
- **WHEN** a winning registration's desired quantity exceeds the user's remaining `max_per_user` allowance
- **THEN** the system SHALL grant an entitlement for at most the remaining allowance

#### Scenario: Draw does not reserve inventory
- **WHEN** the draw grants winner entitlements
- **THEN** the system SHALL NOT increment `reserved_quantity` and SHALL NOT decrement available inventory except through the existing checkout reservation transaction

#### Scenario: Draw does not grant beyond available inventory
- **WHEN** the draw evaluates how many ticket units to grant
- **THEN** it SHALL grant at most the smaller of the configured `allocation` and the available primary inventory after subtracting active unconsumed entitlement quantities

#### Scenario: Draw is idempotent
- **WHEN** the draw worker runs more than once for a lottery already in `COMPLETED` status
- **THEN** the system SHALL NOT grant additional entitlements or re-select winners

#### Scenario: Withdrawn registrations are excluded
- **WHEN** the draw selects winners
- **THEN** the system SHALL skip `WITHDRAWN` registrations

### Requirement: Organizer can run a draw manually
The system SHALL allow an authorized organizer or admin to trigger a `SCHEDULED` lottery draw immediately. Manual draw SHALL use the same deterministic draw use case, lock, audit record, entitlement grant logic, and notification behavior as the scheduled worker.

#### Scenario: Organizer runs draw now
- **WHEN** an authorized organizer triggers manual draw for a `SCHEDULED` lottery
- **THEN** the system SHALL run the same draw logic used by the scheduled worker
- **AND** the system SHALL return granted and not-selected counts
- **AND** the system SHALL persist the same draw audit record and winner/non-winner status changes

#### Scenario: Manual draw is idempotent after completion
- **WHEN** an authorized organizer triggers manual draw for a lottery already in `COMPLETED` status
- **THEN** the system SHALL NOT create additional entitlements or change the recorded outcome
- **AND** the system SHALL return a no-op result

#### Scenario: Manual draw rejects unauthorized user
- **WHEN** a non-organizer audience user triggers manual draw
- **THEN** the system SHALL reject the request before running the draw

### Requirement: Draw outcome is auditable
The system SHALL persist a draw audit record containing the seed, the registrant count considered, the ordered winner list, and the allocation consumed, so the outcome can be independently verified.

#### Scenario: Audit record written after draw
- **WHEN** the draw completes for a ticket type
- **THEN** the system SHALL persist a draw record with the seed, ordered winners, and allocation consumed
- **AND** the system SHALL transition the lottery configuration to `COMPLETED`

### Requirement: Winner entitlement has a bounded lifecycle
The system SHALL grant each winner a purchase entitlement with `source` of `LOTTERY` bound to one user, concert, ticket type, maximum quantity, and expiry timestamp. Entitlement TTL SHALL come from the lottery config's `entitlementTtlMinutes`, defaulting to 15 minutes. The system SHALL reuse the existing purchase entitlement lifecycle for expiry.

#### Scenario: Winner entitlement uses per-lottery TTL
- **WHEN** a draw grants a winner entitlement for a lottery configured with `entitlementTtlMinutes`
- **THEN** the entitlement `expiresAt` SHALL equal the grant time plus the configured TTL

#### Scenario: Winner entitlement expires unused
- **WHEN** a winner's `LOTTERY` entitlement reaches its expiry timestamp without being consumed
- **THEN** the system SHALL mark it expired

#### Scenario: Winner entitlement is consumed by checkout
- **WHEN** a winner successfully creates a direct-purchase pending order using the entitlement
- **THEN** the system SHALL mark the entitlement consumed
- **AND** the system SHALL mark the linked lottery registration fulfilled via the entitlement's `lotteryRegistrationId`

### Requirement: Lottery draw notifies registrants
The system SHALL create an in-app notification and enqueue an email notification for each winner when the draw grants an entitlement, and SHALL notify non-winners that they were not selected. Winner notifications SHALL include the entitlement expiry and an action URL to the relevant checkout flow.

#### Scenario: Winner receives grant notification
- **WHEN** the draw grants an entitlement to a user
- **THEN** the system SHALL persist an in-app notification with the entitlement expiry and an action URL
- **AND** the action URL SHALL use the audience event slug rather than the internal concert identifier

#### Scenario: Winner receives grant email
- **WHEN** the draw grants an entitlement to a user with an email address
- **THEN** the system SHALL enqueue an email notification containing the concert name, ticket type, entitlement quantity, expiry time, and action URL
- **AND** the email subject and body SHALL use Vietnamese text with proper diacritics
- **AND** the email delivery queue job SHALL use a BullMQ-safe custom job ID and configured retry/backoff options

#### Scenario: Non-winner receives not-selected notification
- **WHEN** the draw marks a registration `NOT_SELECTED`
- **THEN** the system SHALL notify that user that they were not selected in the draw

#### Scenario: Notification failure does not roll back the draw
- **WHEN** notification creation fails after the draw grants an entitlement
- **THEN** the entitlement and draw outcome SHALL remain and the failure SHALL be reported for retry or investigation

### Requirement: Lottery draw worker runs in worker scope
The system SHALL run the scheduled lottery draw processor in the backend worker application scope and SHALL NOT start the lottery draw processor in the API application.

#### Scenario: Draw processor starts with its queue provider
- **WHEN** the backend worker application starts
- **THEN** the lottery draw processor SHALL resolve its Bull queue provider from its own Nest module scope
- **AND** the API application SHALL NOT start the lottery draw background processor

### Requirement: Presale lottery excludes resale and waiting-room behavior
The presale lottery SHALL NOT listen to resale listing state changes, create resale orders, modify resale listings, or implement any virtual waiting room, admission queue, or admission token behavior.

#### Scenario: Resale listing becomes active
- **WHEN** a resale listing transitions to active
- **THEN** the presale lottery SHALL NOT treat that listing as lottery inventory or grant an entitlement from it

#### Scenario: No admission token behavior
- **WHEN** the presale lottery grants a winner entitlement
- **THEN** the system SHALL NOT issue an admission queue token or virtual waiting-room position
