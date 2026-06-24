## MODIFIED Requirements

### Requirement: Purchase confirmation notifications

The system SHALL send an in-app notification and email confirmation with e-ticket access after
successful payment. When an order transitions to the paid state and its e-tickets are issued, the
system SHALL enqueue exactly one purchase confirmation per order, and a failure to enqueue or deliver
the confirmation SHALL NOT roll back the paid order or the issued tickets.

#### Scenario: Paid order queues confirmation

- **WHEN** an order becomes paid
- **THEN** the system SHALL enqueue confirmation notifications for the customer

#### Scenario: Paid-order ticket issuance triggers confirmation enqueue

- **WHEN** the paid-order flow issues e-tickets for a newly paid order
- **THEN** the system SHALL enqueue a purchase confirmation job carrying the customer's email and
  display name, the concert title and start time, the ticket count, and an e-ticket access URL

#### Scenario: Confirmation enqueue is idempotent per order

- **WHEN** the paid-order transition for the same order is processed more than once
- **THEN** the system SHALL NOT create duplicate confirmation notifications for that order

#### Scenario: Email delivery failure is retried

- **WHEN** email sending fails transiently
- **THEN** the system SHALL retry delivery without rolling back the paid order
