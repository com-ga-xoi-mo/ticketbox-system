# notification-delivery Specification

## Purpose
TBD - created by archiving change define-ticketbox-blueprint. Update Purpose after archive.
## Requirements
### Requirement: Purchase confirmation notifications
The system SHALL send an in-app notification and email confirmation with e-ticket access after successful payment.

#### Scenario: Paid order queues confirmation
- **WHEN** an order becomes paid
- **THEN** the system SHALL enqueue confirmation notifications for the customer

#### Scenario: Email delivery failure is retried
- **WHEN** email sending fails transiently
- **THEN** the system SHALL retry delivery without rolling back the paid order

### Requirement: Concert reminder notifications
The system SHALL send reminders to ticket holders 24 hours before the concert starts.

#### Scenario: Reminder job finds ticket holders
- **WHEN** a concert is 24 hours from start time
- **THEN** the system SHALL enqueue reminder notifications for users with valid tickets

### Requirement: Extensible notification channels
The system SHALL model notification delivery through channel adapters so future SMS or Zalo OA channels can be added without changing purchase logic.

#### Scenario: New channel is added
- **WHEN** a new notification channel adapter is registered
- **THEN** existing notification use cases SHALL be able to route messages through that adapter by configuration

### Requirement: Notification delivery lint gate compliance
The notification delivery test and support code SHALL satisfy the repository ESLint gate without changing notification delivery runtime behavior.

#### Scenario: Notification support code passes lint
- **WHEN** the repository lint command runs after this change is implemented
- **THEN** notification delivery test doubles, support adapters, and processor specs SHALL not report unused-parameter or type-only import ESLint errors

#### Scenario: Notification behavior remains unchanged
- **WHEN** the notification delivery regression tests run after the lint cleanup
- **THEN** purchase confirmation creation, email delivery retry behavior, and notification processor behavior SHALL continue to pass without queue contract, email behavior, database schema, API surface, or mobile app changes

### Requirement: Notification adapter structure is explicit
The system SHALL organize notification delivery folders so contributors can identify worker-driven inbound queue adapters, infrastructure provider implementations, and intentionally absent HTTP adapters without changing notification runtime behavior.

#### Scenario: Worker-driven inbound adapters are visible
- **WHEN** a contributor inspects the notification module
- **THEN** BullMQ processors SHALL be located under an inbound queue adapter boundary and documented as the worker-triggered entry points for notification delivery

#### Scenario: Infrastructure implementations are visible
- **WHEN** the notification module persists notifications, enqueues notification jobs, or sends email
- **THEN** the Prisma repository, queue producer, and email channel implementations SHALL be located under notification infrastructure boundaries while preserving the existing notification ports and integration contracts

#### Scenario: HTTP adapter absence is intentional
- **WHEN** a contributor inspects the notification module
- **THEN** the module SHALL document that no notification HTTP adapter exists in this slice because notification delivery is currently triggered by worker events and queue jobs

#### Scenario: Payment integration remains external
- **WHEN** payment/order fulfillment emits a paid-order notification event in a later change
- **THEN** it SHALL use the existing notification producer/event contract without moving payment fulfillment logic into the notification module

#### Scenario: Runtime notification contracts remain unchanged
- **WHEN** the notification module structure is refactored
- **THEN** queue names, job names, queue payloads, email behavior, database schema, public API surface, and notification business logic SHALL remain unchanged

