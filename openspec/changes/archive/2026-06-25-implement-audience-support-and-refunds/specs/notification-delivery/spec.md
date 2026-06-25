## ADDED Requirements

### Requirement: Support and refund notifications
The system SHALL create in-app notifications for support request and refund request lifecycle updates, with optional email delivery for user-visible milestones.

#### Scenario: Support request is created
- **WHEN** an audience support request is created
- **THEN** the system persists an in-app notification for the requesting user with a link to the support request detail

#### Scenario: Refund request status changes
- **WHEN** a refund request status changes to `UNDER_REVIEW`, `APPROVED`, `REJECTED`, or `CANCELLED`
- **THEN** the system persists an in-app notification for the requesting user and may enqueue email delivery for configured milestone statuses

#### Scenario: Notification creation fails
- **WHEN** notification persistence or enqueueing fails during support or refund processing
- **THEN** the support or refund state change remains committed and the failure is reported for retry or investigation

### Requirement: Ticket resend delivery
The system SHALL support user-requested ticket resend delivery without issuing duplicate tickets or persisting raw QR material.

#### Scenario: Resend delivery loads issued tickets
- **WHEN** a ticket resend notification is delivered
- **THEN** the worker loads existing issued tickets for the owned order or ticket and recreates QR images transiently for the email

#### Scenario: Resend does not duplicate fulfillment
- **WHEN** a user requests ticket resend for an order that already received purchase confirmation
- **THEN** the system does not issue tickets again and does not mutate order payment state

#### Scenario: Repeated resend is controlled
- **WHEN** the same user repeatedly requests resend within the configured cooldown or dedupe window
- **THEN** the system returns the existing resend status or a controlled cooldown error without creating unbounded email jobs

### Requirement: Notification inbox metadata
The system SHALL persist notification metadata needed by the audience notification center while preserving existing delivery behavior.

#### Scenario: In-app notification has action metadata
- **WHEN** the system creates an in-app support, refund, order, payment, reminder, or ticket notification
- **THEN** the notification can include type, subject, body, action URL, resource type, resource ID, and read state

#### Scenario: Existing delivery jobs remain compatible
- **WHEN** existing purchase confirmation or concert reminder delivery jobs run
- **THEN** queue names, job names, retry behavior, and email delivery behavior remain compatible with the current notification delivery flow
