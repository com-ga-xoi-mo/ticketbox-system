# audience-support-center

## Purpose
TBD - created by syncing change implement-audience-support-and-refunds.

## Requirements

### Requirement: Audience support center entry points
The system SHALL provide an authenticated audience support center linked from account overview, order detail, and ticket detail pages.

#### Scenario: Audience opens support center from account
- **WHEN** an authenticated `AUDIENCE` user opens the account support entry point
- **THEN** the audience app displays a responsive support center with support request, refund request, ticket resend, and download options

#### Scenario: Guest is redirected from support center
- **WHEN** an unauthenticated user opens the support center route
- **THEN** the audience app redirects the user through the audience login flow before showing support data

### Requirement: Support request creation for owned resources
The system SHALL allow an authenticated `AUDIENCE` user to create a support request for an owned order, an owned ticket, or a general account issue.

#### Scenario: User creates order support request
- **WHEN** the user submits a support request with an order ID that belongs to their account
- **THEN** the backend creates a support request with status `OPEN` and returns the created request

#### Scenario: User creates ticket support request
- **WHEN** the user submits a support request with a ticket ID that belongs to their account
- **THEN** the backend creates a support request linked to that ticket and its order

#### Scenario: User references another user's resource
- **WHEN** the user submits a support request for an order or ticket they do not own
- **THEN** the backend returns `404` and does not reveal whether the resource exists

### Requirement: Support request tracking
The system SHALL show support request status history to the owning audience user.

#### Scenario: User views support request detail
- **WHEN** the user opens a support request they own
- **THEN** the system displays the current status, submitted message, linked order or ticket, creation time, and chronological status timeline

#### Scenario: User views support request list
- **WHEN** the user opens the support center
- **THEN** the system lists their support requests sorted by most recently updated first

### Requirement: Refund request eligibility and submission
The system SHALL allow refund requests only for eligible owned paid orders or issued tickets and SHALL track refund request status without performing provider settlement.

#### Scenario: Paid order is eligible for refund request
- **WHEN** the user opens a paid order that is within the configured refund request window
- **THEN** the system offers a refund request action with the refundable order or ticket items

#### Scenario: Ineligible order explains why
- **WHEN** the user opens an expired, cancelled, failed, already refunded, or otherwise ineligible order
- **THEN** the system disables refund submission and displays the eligibility reason

#### Scenario: User submits refund request
- **WHEN** the user submits a valid refund request with a reason and owned order or ticket reference
- **THEN** the backend creates a refund request with status `REQUESTED` and does not call a payment provider refund API

#### Scenario: Duplicate active refund request
- **WHEN** the user submits another refund request for the same order or ticket while a request is active
- **THEN** the backend rejects the duplicate request and returns the existing active request reference

### Requirement: Refund request tracking
The system SHALL let the owning audience user track refund request status and outcome.

#### Scenario: User views refund request detail
- **WHEN** the user opens a refund request they own
- **THEN** the system displays the current status, requested amount or ticket count, reason, linked order or ticket, and status timeline

#### Scenario: Refund request status changes
- **WHEN** a refund request transitions to `UNDER_REVIEW`, `APPROVED`, `REJECTED`, or `CANCELLED`
- **THEN** the status timeline records the change and the user can see it from the support center

### Requirement: Ticket resend by email
The system SHALL allow an authenticated audience user to request ticket email resend for owned paid orders or issued tickets using existing notification delivery behavior.

#### Scenario: User resends tickets for paid order
- **WHEN** the user requests resend for an owned paid order with issued tickets
- **THEN** the backend enqueues or persists a ticket resend notification and returns a success response with resend status

#### Scenario: User resends a single ticket
- **WHEN** the user requests resend for an owned issued ticket
- **THEN** the email delivery includes that ticket's human-readable details and a transiently generated QR image

#### Scenario: Resend is unavailable
- **WHEN** the user requests resend for an unpaid order, missing ticket, refunded ticket, or another user's resource
- **THEN** the backend rejects the request with a controlled error and does not enqueue email delivery

### Requirement: Ticket and order confirmation downloads
The system SHALL provide downloadable or printable ticket and order confirmation views for owned resources when the existing data is sufficient.

#### Scenario: User downloads ticket view
- **WHEN** the user requests a downloadable view for an owned issued ticket
- **THEN** the system returns ticket details and a transient QR payload suitable for rendering or printing

#### Scenario: User downloads order confirmation
- **WHEN** the user requests an order confirmation for an owned paid order
- **THEN** the system returns order, payment, concert, and line-item details suitable for an invoice-like confirmation view

#### Scenario: Confirmation is not a fiscal invoice
- **WHEN** the order confirmation view is displayed or downloaded
- **THEN** the UI labels it as a purchase confirmation and does not present it as a legal tax invoice
