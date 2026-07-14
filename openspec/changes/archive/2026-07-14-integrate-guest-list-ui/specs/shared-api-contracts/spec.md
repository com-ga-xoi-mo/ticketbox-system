## ADDED Requirements

### Requirement: Shared Admin guest-list management contracts

The `@ticketbox/api-types` package SHALL be the canonical source for strict Admin guest-list upload, request outcome, public batch, report, report-row, and non-reportable-batch error wire schemas and inferred types.

#### Scenario: Upload contract is strict and bounded

- **WHEN** a backend or web consumer parses an Admin upload request
- **THEN** the shared schema SHALL require bounded `sourceName`, supported `contentType`, and bounded Base64 content and SHALL reject unknown fields

#### Scenario: Public batch contract exposes only client data

- **WHEN** a guest-list batch is serialized or parsed at an HTTP boundary
- **THEN** the shared schema SHALL permit the public lifecycle fields, counters, and a boolean report-availability indicator and SHALL reject storage keys, filesystem paths, lease fields, and queue internals

#### Scenario: Request outcome identifies the canonical batch

- **WHEN** an Admin upload response is parsed
- **THEN** the shared schema SHALL accept only `CREATED` or `IDEMPOTENT_DUPLICATE` with one valid public batch

#### Scenario: Report contract preserves row evidence

- **WHEN** an Admin report response is parsed
- **THEN** the shared schema SHALL validate the batch identity, checksum, reconciled summary, row number, action, nullable guest source fields, disposition, and optional reason details

#### Scenario: Structured non-reportable error is portable

- **WHEN** a report request returns `BATCH_NOT_COMPLETED`
- **THEN** the shared schema SHALL validate the error code, non-reportable batch status, and descriptive message for consistent web handling

#### Scenario: Guest-list schemas preserve package boundaries

- **WHEN** package imports and build output are inspected
- **THEN** the new schemas SHALL be exported from the package root, compile to runtime JavaScript and declarations, and SHALL NOT import NestJS, Prisma, React, backend domain, or application UI types
