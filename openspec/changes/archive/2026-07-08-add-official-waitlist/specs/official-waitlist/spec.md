## ADDED Requirements

### Requirement: Audience user can join an official waitlist
The system SHALL allow an authenticated AUDIENCE user to join the official waitlist for a primary-sale ticket type when public checkout cannot currently reserve that ticket type because available primary inventory is exhausted or the ticket type is already waitlist-gated.

#### Scenario: User joins waitlist for sold-out ticket type
- **WHEN** an authenticated AUDIENCE user joins the waitlist for a published concert ticket type whose primary availability is zero
- **THEN** the system SHALL create an active waitlist entry for that user, concert, and ticket type with a queue position based on join time

#### Scenario: Duplicate active waitlist entry is rejected
- **WHEN** a user who already has an active waitlist entry for the same ticket type attempts to join again
- **THEN** the system SHALL return the existing waitlist status instead of creating a duplicate active entry

#### Scenario: Waitlist rejects resale sources
- **WHEN** a request attempts to join or grant waitlist access for a resale listing
- **THEN** the system SHALL reject the request because official waitlist applies only to primary-sale ticket types

### Requirement: Audience user can leave the official waitlist
The system SHALL allow an authenticated AUDIENCE user to leave their active official waitlist entry before it is fulfilled.

#### Scenario: User leaves waiting entry
- **WHEN** a user leaves an active waiting entry
- **THEN** the system SHALL mark the entry cancelled and SHALL exclude it from future entitlement grants

#### Scenario: User leaves after entitlement granted
- **WHEN** a user leaves the waitlist after receiving an active entitlement
- **THEN** the system SHALL revoke the active entitlement and make the released opportunity eligible for the next waitlist user

### Requirement: Waitlist status is visible to the audience user
The system SHALL expose the authenticated user's waitlist status for a concert ticket type, including entry status, approximate queue position, active entitlement details when granted, and entitlement expiry time.

#### Scenario: Waiting user sees queue position
- **WHEN** an authenticated user requests waitlist status for a ticket type where they have an active waiting entry
- **THEN** the system SHALL return the entry status and an approximate queue position based on active entries ahead of them

#### Scenario: Granted user sees entitlement expiry
- **WHEN** an authenticated user requests waitlist status after an entitlement has been granted
- **THEN** the system SHALL return the entitlement status, maximum purchasable quantity, and expiry timestamp

### Requirement: Primary inventory release grants waitlist entitlements
The system SHALL grant short-lived purchase entitlements to active waitlist entries in FIFO order when primary-sale inventory becomes available from direct-purchase reservation release. The release signal SHALL identify affected primary-sale ticket types and released quantities. Granting an entitlement SHALL NOT mutate `ticket_types.reserved_quantity` or `ticket_types.sold_quantity`.

#### Scenario: Expired reservation grants next waitlist user
- **WHEN** a direct-purchase pending order expires and releases primary inventory for a ticket type with active waitlist entries
- **THEN** the waitlist worker SHALL grant a purchase entitlement to the earliest eligible active waitlist entry for that ticket type

#### Scenario: Expired reservation reports released primary items
- **WHEN** a direct-purchase pending order expires and releases reserved primary-sale order items
- **THEN** the ordering expiration flow SHALL expose each affected `ticketTypeId` and `quantityReleased` to waitlist grant processing

#### Scenario: Entitlement grant does not reserve inventory
- **WHEN** a waitlist entitlement is granted
- **THEN** the system SHALL NOT increment `reserved_quantity`
- **AND** the system SHALL NOT decrement available inventory except through the existing checkout reservation transaction

#### Scenario: Grant worker does not over-invite beyond available inventory
- **WHEN** the waitlist grant worker evaluates a ticket type
- **THEN** it SHALL grant entitlements only while unreserved primary inventory remains after accounting for active unconsumed entitlements

#### Scenario: Cancelled entries are skipped
- **WHEN** the waitlist grant worker selects entries for entitlement grants
- **THEN** it SHALL skip cancelled, fulfilled, expired, or already-granted entries

#### Scenario: Waitlist worker starts with its queue provider
- **WHEN** the backend worker application starts
- **THEN** the official waitlist processor SHALL resolve the `OFFICIAL_WAITLIST_QUEUE` Bull queue provider from its Nest module scope
- **AND** the API application SHALL NOT start the official waitlist background processor

### Requirement: Waitlist entitlement has bounded lifecycle
The system SHALL track each purchase entitlement from grant through consumption, expiry, or revocation. An entitlement SHALL be bound to one user, concert, ticket type, source, maximum quantity, and expiry timestamp. Entitlement TTL SHALL be configurable with a default of 15 minutes.

#### Scenario: Entitlement expires unused
- **WHEN** an active entitlement reaches its expiry timestamp without being consumed
- **THEN** the system SHALL mark it expired and make the corresponding waitlist opportunity available to the next eligible entry

#### Scenario: Entitlement is consumed by checkout
- **WHEN** an entitled user successfully creates a direct-purchase pending order using the entitlement
- **THEN** the system SHALL mark the entitlement consumed
- **AND** it SHALL mark the waitlist entry fulfilled

#### Scenario: Expired entitlement cannot be consumed
- **WHEN** a checkout request references an expired entitlement
- **THEN** the system SHALL reject the entitlement before creating an order or mutating inventory

### Requirement: Waitlist grant notifies the user
The system SHALL create an in-app notification and enqueue an email notification when a waitlist entitlement is granted. Both notifications SHALL include an action URL that takes the user to the relevant concert or checkout flow.

#### Scenario: User receives grant notification
- **WHEN** the waitlist worker grants an entitlement to a user
- **THEN** the system SHALL persist an in-app notification for that user with the entitlement expiry time and an action URL
- **AND** the action URL SHALL use the audience event slug rather than the internal concert identifier

#### Scenario: User receives grant email
- **WHEN** the waitlist worker grants an entitlement to a user with an email address
- **THEN** the system SHALL enqueue an email notification containing the concert name, ticket type, entitlement quantity, expiry time, and action URL
- **AND** the email subject and body SHALL use Vietnamese text with proper diacritics
- **AND** the email delivery queue job SHALL use a BullMQ-safe custom job ID and configured retry/backoff options
- **AND** email enqueueing SHALL NOT block or roll back the entitlement grant if delivery later fails

#### Scenario: User receives near-expiry reminder email
- **WHEN** an active waitlist entitlement is approaching expiry and has not been consumed, revoked, or expired
- **THEN** the system SHALL enqueue one near-expiry reminder email for that entitlement
- **AND** the reminder email subject and body SHALL use Vietnamese text with proper diacritics
- **AND** the reminder email delivery queue job SHALL use a BullMQ-safe custom job ID and configured retry/backoff options
- **AND** repeated worker runs SHALL NOT enqueue duplicate reminder emails for the same entitlement

#### Scenario: Waitlist email delivery job is accepted by BullMQ
- **WHEN** the waitlist notification service creates an email notification for a granted or expiring entitlement
- **THEN** the notification delivery job SHALL be accepted by the configured BullMQ queue
- **AND** the notification SHALL NOT remain pending only because the custom job ID contains an invalid character

#### Scenario: Notification failure does not roll back grant
- **WHEN** notification creation fails after an entitlement is granted
- **THEN** the entitlement SHALL remain granted and the failure SHALL be reported for retry or investigation

### Requirement: Official waitlist excludes resale marketplace behavior
The official waitlist SHALL NOT listen to resale listing state changes, create resale orders, modify resale listings, or alter resale ticket transfer behavior.

#### Scenario: Resale listing becomes active
- **WHEN** a `ResaleListing` transitions to `ACTIVE`
- **THEN** the official waitlist SHALL NOT grant a primary-sale entitlement from that resale listing

#### Scenario: Resale P2P order expires
- **WHEN** a resale P2P order expires and its listing returns to `ACTIVE`
- **THEN** the official waitlist SHALL NOT treat that listing as primary-sale inventory
