## ADDED Requirements

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

