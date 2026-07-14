# official-waitlist Specification

## Purpose

Defines the official primary-sale waitlist for sold-out ticket types as a notify-only subscription: waitlist membership, availability-recovery notifications when a sold-out ticket type returns to public sale, and the explicit exclusion of resale marketplace behavior. The waitlist grants no purchase entitlement, priority, or reserved slot — recovered inventory stays in the public pool.

## Requirements

### Requirement: Audience user can join an official waitlist
The system SHALL allow an authenticated AUDIENCE user to join the official waitlist for a primary-sale ticket type only when that ticket type is currently sold out (public availability is zero). Joining SHALL NOT reserve inventory, grant any purchase priority, or create a purchase entitlement — it only subscribes the user to a notification when the ticket type returns to public sale.

#### Scenario: User joins waitlist for sold-out ticket type
- **WHEN** an authenticated AUDIENCE user joins the waitlist for a published concert ticket type whose public availability is zero
- **THEN** the system SHALL create an active waitlist subscription for that user, concert, and ticket type
- **AND** the system SHALL NOT create a purchase entitlement or reserve any inventory

#### Scenario: Join is rejected when the ticket type is not sold out
- **WHEN** a user attempts to join the waitlist for a ticket type whose public availability is greater than zero
- **THEN** the system SHALL reject the request because the ticket type can be bought directly

#### Scenario: Duplicate active waitlist entry is rejected
- **WHEN** a user who already has an active waitlist subscription for the same ticket type attempts to join again
- **THEN** the system SHALL return the existing waitlist status instead of creating a duplicate active subscription

#### Scenario: Waitlist rejects resale sources
- **WHEN** a request attempts to join the waitlist for a resale listing
- **THEN** the system SHALL reject the request because official waitlist applies only to primary-sale ticket types

### Requirement: Audience user can leave the official waitlist
The system SHALL allow an authenticated AUDIENCE user to leave their active official waitlist subscription at any time.

#### Scenario: User leaves an active subscription
- **WHEN** a user leaves an active waitlist subscription
- **THEN** the system SHALL mark the subscription cancelled and SHALL exclude it from future recovery notifications

### Requirement: Waitlist status is visible to the audience user
The system SHALL expose the authenticated user's waitlist status for a concert ticket type, including whether the user is actively subscribed. The status SHALL NOT include any purchase entitlement, priority slot, or expiry, because the waitlist grants none.

#### Scenario: Subscribed user sees their subscription
- **WHEN** an authenticated user requests waitlist status for a ticket type where they have an active subscription
- **THEN** the system SHALL return the active subscription status
- **AND** the status SHALL NOT include any entitlement, slot, or expiry field

### Requirement: Waitlist notifies subscribers when a sold-out ticket type returns to public sale
The system SHALL notify active waitlist subscribers when a ticket type's public availability transitions from zero to greater than zero (a sold-out → available recovery), using a per-ticket-type availability marker. The trigger SHALL be the availability transition itself — detected by a periodic availability watcher reading `totalQuantity - reservedQuantity - soldQuantity` — and SHALL NOT depend on any single inventory-release path. Detection SHALL NOT run inside the reservation transaction. The recovered inventory SHALL remain in the public pool: the system SHALL NOT create a purchase entitlement, reserve inventory, or block non-subscribers from buying it.

#### Scenario: Recovery from sold-out notifies subscribers
- **WHEN** a ticket type that was sold out (availability zero) returns to availability greater than zero, for example because a pending reservation expired or an order was cancelled
- **THEN** the system SHALL notify the active waitlist subscribers for that ticket type

#### Scenario: Notify all active subscribers
- **WHEN** the recovery edge fires for a ticket type
- **THEN** the system SHALL notify every active subscriber for that ticket type, with no priority ordering, cap, or reserved slot

#### Scenario: Notify once per sold-out episode
- **WHEN** availability is already greater than zero and remains greater than zero
- **THEN** the system SHALL NOT send repeat recovery notifications
- **AND** the system SHALL re-arm notification only after availability returns to zero and later recovers again

#### Scenario: Recovered ticket stays in the public pool
- **WHEN** the system notifies subscribers about a recovered ticket type
- **THEN** the ticket type SHALL remain purchasable by anyone through normal checkout
- **AND** the system SHALL NOT grant the subscriber any priority, slot, or entitlement

#### Scenario: Notification content directs the user to buy immediately without a reserved slot
- **WHEN** the system sends a recovery notification (in-app and email)
- **THEN** the content SHALL state that the ticket returned to public sale and the user should buy immediately
- **AND** the content SHALL NOT state or imply that the user holds a reserved slot or purchase priority
- **AND** the email SHALL use Vietnamese text with proper diacritics

### Requirement: Official waitlist excludes resale marketplace behavior
The official waitlist SHALL NOT listen to resale listing state changes, create resale orders, modify resale listings, or alter resale ticket transfer behavior.

#### Scenario: Resale listing becomes active
- **WHEN** a `ResaleListing` transitions to `ACTIVE`
- **THEN** the official waitlist SHALL NOT grant a primary-sale entitlement from that resale listing

#### Scenario: Resale P2P order expires
- **WHEN** a resale P2P order expires and its listing returns to `ACTIVE`
- **THEN** the official waitlist SHALL NOT treat that listing as primary-sale inventory
