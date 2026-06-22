## ADDED Requirements

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
