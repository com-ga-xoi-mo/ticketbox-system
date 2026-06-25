## ADDED Requirements

### Requirement: Audience support and refund contracts
The shared contract package SHALL export framework-independent schemas and types for audience support request and refund request APIs.

#### Scenario: Support request schemas are exported
- **WHEN** a consumer imports from `@ticketbox/api-types`
- **THEN** the package exports schemas and inferred types for creating, listing, and reading audience support requests

#### Scenario: Refund request schemas are exported
- **WHEN** a consumer imports from `@ticketbox/api-types`
- **THEN** the package exports schemas and inferred types for refund eligibility, refund request creation, refund request listing, and refund request detail

#### Scenario: Request status enums are bounded
- **WHEN** support or refund status values are parsed by shared schemas
- **THEN** unknown status values are rejected by the corresponding Zod enum

### Requirement: Audience notification inbox contracts
The shared contract package SHALL export schemas and types for audience notification inbox list, unread count, and read-state mutation responses.

#### Scenario: Notification list schema validates inbox items
- **WHEN** `AudienceNotificationListResponseSchema` parses a response
- **THEN** each item includes ID, type, title or subject, body, created timestamp, nullable read timestamp, and optional resource link metadata

#### Scenario: Unread count schema validates count
- **WHEN** `AudienceNotificationUnreadCountResponseSchema` parses a response
- **THEN** it accepts a non-negative integer unread count and rejects invalid counts

#### Scenario: Mark read response schema validates result
- **WHEN** a mark-read mutation response is parsed
- **THEN** the shared schema validates the updated read timestamp or updated count result

### Requirement: Audience resend and download contracts
The shared contract package SHALL export schemas and types for ticket resend, ticket download, and order confirmation download flows.

#### Scenario: Ticket resend response schema is exported
- **WHEN** a consumer imports from `@ticketbox/api-types`
- **THEN** the package exports the ticket resend response schema with delivery status and optional cooldown metadata

#### Scenario: Ticket download schema validates QR payload
- **WHEN** a ticket download response is parsed
- **THEN** the schema validates ticket, concert, order, and nullable QR payload fields without exposing signing secrets

#### Scenario: Order confirmation schema validates confirmation data
- **WHEN** an order confirmation response is parsed
- **THEN** the schema validates order summary, line items, payment summary, concert details, and purchase-confirmation labeling fields

### Requirement: Contract package boundaries are preserved
The new audience support, refund, notification, resend, and download contracts SHALL remain framework-independent.

#### Scenario: Contracts compile without backend imports
- **WHEN** `@ticketbox/api-types` is built
- **THEN** the new contract files depend only on Zod and local contract modules, not backend, Prisma, NestJS, React, or audience web code

#### Scenario: Backend and audience clients validate same contracts
- **WHEN** backend HTTP adapter contract tests and audience web API-client tests run
- **THEN** both sides validate support, refund, notification, resend, and download payloads with the shared schemas
