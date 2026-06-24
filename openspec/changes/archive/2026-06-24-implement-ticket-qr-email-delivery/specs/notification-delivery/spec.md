## MODIFIED Requirements

### Requirement: Purchase confirmation notifications

The system SHALL send an in-app notification and email confirmation with e-ticket access after successful payment. When an order transitions to the paid state and its e-tickets are issued, the system SHALL enqueue exactly one purchase confirmation per order, and a failure to enqueue or deliver the confirmation SHALL NOT roll back the paid order or the issued tickets. The purchase confirmation email SHALL include human-readable details and one scannable QR image for every issued ticket in the order. QR payloads and image bytes SHALL be recreated only for the active delivery attempt and SHALL NOT be persisted in notification records, queue payloads, object storage, or logs.

#### Scenario: Paid order queues confirmation

- **WHEN** an order becomes paid
- **THEN** the system SHALL enqueue confirmation notifications for the customer

#### Scenario: Paid-order ticket issuance triggers confirmation enqueue

- **WHEN** the paid-order flow issues e-tickets for a newly paid order
- **THEN** the system SHALL enqueue a purchase confirmation job carrying the customer's email and display name, the concert title and start time, the ticket count, the order identifier, and an e-ticket access URL
- **AND** the job SHALL NOT contain raw QR payloads or QR image bytes

#### Scenario: Single issued ticket is delivered by email

- **WHEN** the notification worker delivers a purchase confirmation for an order with one issued ticket
- **THEN** the email SHALL identify the ticket number, ticket type, concert title, and concert start time
- **AND** the email SHALL contain a scannable PNG QR image representing that ticket's signed payload

#### Scenario: Multiple issued tickets receive distinct QR images

- **WHEN** the notification worker delivers a purchase confirmation for an order with multiple issued tickets
- **THEN** the email SHALL contain one clearly identified QR image for each issued ticket
- **AND** each image SHALL encode the payload of its corresponding ticket rather than a shared order-level payload

#### Scenario: QR delivery material is generated transiently

- **WHEN** the notification worker prepares a purchase confirmation delivery attempt
- **THEN** it SHALL load existing issued tickets, recreate each payload using the configured QR token secret, and render the QR PNG in memory
- **AND** it SHALL NOT persist the raw payload, PNG bytes, signing secret, or QR content in PostgreSQL, Redis job data, object storage, or application logs

#### Scenario: Confirmation enqueue is idempotent per order

- **WHEN** the paid-order transition for the same order is processed more than once
- **THEN** the system SHALL NOT create duplicate confirmation notifications for that order
- **AND** it SHALL NOT issue duplicate tickets

#### Scenario: Email delivery failure is retried

- **WHEN** email sending fails transiently
- **THEN** the system SHALL retry delivery without rolling back the paid order
- **AND** each retry SHALL recreate QR images from the existing issued tickets without issuing new tickets

#### Scenario: Missing issued-ticket data fails delivery safely

- **WHEN** a purchase confirmation delivery attempt cannot load the issued tickets expected for the paid order
- **THEN** the attempt SHALL fail through the existing bounded retry flow
- **AND** the notification worker SHALL NOT create, repair, or mutate tickets

#### Scenario: Existing notification channels remain compatible

- **WHEN** a notification other than a QR purchase confirmation is delivered
- **THEN** the existing in-app, Maildev, and authenticated SMTP behavior SHALL continue without requiring attachments
