## ADDED Requirements

### Requirement: Seller can list an issued ticket for resale
The system SHALL allow an authenticated AUDIENCE user to list an `ISSUED` ticket they own for resale via `POST /resale/listings`. The system SHALL validate that the ticket status is `ISSUED`, the ticket belongs to the requesting user, the event has resale enabled, and the listing window has not closed (at least 2 hours before event start). Upon successful listing, the system SHALL transition the ticket status to `LISTED_FOR_RESALE` and void the existing `qrTokenHash`.

#### Scenario: Successful ticket listing
- **WHEN** an authenticated user submits a resale listing request for an `ISSUED` ticket they own, for an event with resale enabled, with an asking price within the allowed cap
- **THEN** the system SHALL create a `ResaleListing` with status `ACTIVE`, transition the ticket to `LISTED_FOR_RESALE`, void the original `qrTokenHash`, and return the listing details

#### Scenario: Listing rejected for non-owned ticket
- **WHEN** a user attempts to list a ticket owned by another user
- **THEN** the system SHALL reject the request with a not-found error

#### Scenario: Listing rejected for non-ISSUED ticket
- **WHEN** a user attempts to list a ticket with status other than `ISSUED` (e.g., `CHECKED_IN`, `VOIDED`, `REFUNDED`)
- **THEN** the system SHALL reject the request indicating the ticket is not eligible for resale

#### Scenario: Listing rejected for resale-disabled event
- **WHEN** a user attempts to list a ticket for an event where the organizer has disabled resale
- **THEN** the system SHALL reject the request indicating resale is not available for this event

#### Scenario: Listing rejected within cutoff window
- **WHEN** a user attempts to list a ticket less than 2 hours before the event's start time
- **THEN** the system SHALL reject the request indicating the resale window has closed

#### Scenario: Listing rejected for guest-list or complimentary ticket
- **WHEN** a user attempts to list a ticket that was issued via guest-list import (not purchased through a standard order)
- **THEN** the system SHALL reject the request indicating complimentary tickets are not eligible for resale

### Requirement: Asking price enforces price cap
The system SHALL enforce that the asking price does not exceed the configured maximum resale price. The default cap is 110% of the ticket type's `priceVnd`. If the event has a custom resale price cap configured, that value SHALL take precedence over the default.

#### Scenario: Price within default cap accepted
- **WHEN** a seller sets an asking price at or below 110% of the ticket's face value for an event with no custom cap
- **THEN** the system SHALL accept the listing with the specified asking price

#### Scenario: Price exceeding default cap rejected
- **WHEN** a seller sets an asking price above 110% of the ticket's face value for an event with no custom cap
- **THEN** the system SHALL reject the listing with an error indicating the maximum allowed price

#### Scenario: Custom event cap overrides default
- **WHEN** an event has a custom resale cap of 100% (no markup) and a seller sets an asking price above face value
- **THEN** the system SHALL reject the listing based on the event's custom cap, not the default 110%

#### Scenario: Price at or below face value always accepted
- **WHEN** a seller sets an asking price at or below the original face value
- **THEN** the system SHALL accept the listing regardless of cap configuration

### Requirement: Seller can cancel a resale listing
The system SHALL allow the seller to cancel their `ACTIVE` resale listing via `DELETE /resale/listings/:id`. Upon cancellation, the system SHALL transition the listing to `CANCELLED`, restore the ticket status to `ISSUED`, and generate a new `qrTokenHash` for the ticket.

#### Scenario: Successful listing cancellation
- **WHEN** the listing owner cancels an `ACTIVE` listing
- **THEN** the system SHALL mark the listing as `CANCELLED`, restore the ticket to `ISSUED` status, generate a new `qrTokenHash`, and notify the seller that their ticket has been restored with a new QR code

#### Scenario: Cancellation rejected for non-owner
- **WHEN** a user attempts to cancel a listing they do not own
- **THEN** the system SHALL reject the request with a not-found error

#### Scenario: Cancellation rejected for non-ACTIVE listing
- **WHEN** a user attempts to cancel a listing that is already `SOLD` or `CANCELLED` or `EXPIRED`
- **THEN** the system SHALL reject the request indicating the listing cannot be cancelled in its current state

### Requirement: Listings auto-expire before event start
The system SHALL automatically expire `ACTIVE` resale listings 2 hours before the event's `startAt` time. A BullMQ scheduled job SHALL scan for listings past their expiry window, transition them to `EXPIRED`, restore the associated ticket to `ISSUED` status, and generate a new `qrTokenHash`.

#### Scenario: Listing auto-expired before event
- **WHEN** the scheduled expiry job runs and finds an `ACTIVE` listing whose event starts within 2 hours
- **THEN** the system SHALL transition the listing to `EXPIRED`, restore the ticket to `ISSUED`, generate a new `qrTokenHash`, and notify the seller

#### Scenario: Already cancelled or sold listings are skipped
- **WHEN** the expiry job encounters a listing with status `CANCELLED` or `SOLD`
- **THEN** the system SHALL skip it without modification

### Requirement: Seller can view their resale listings
The system SHALL allow an authenticated user to view their own resale listings via `GET /me/resale/listings`. The response SHALL include listing status, asking price, ticket details, and event information.

#### Scenario: Seller views active listings
- **WHEN** an authenticated user requests their resale listings
- **THEN** the system SHALL return all listings created by that user, ordered by creation date descending

#### Scenario: Seller with no listings sees empty result
- **WHEN** an authenticated user with no resale listings requests the endpoint
- **THEN** the system SHALL return an empty list
