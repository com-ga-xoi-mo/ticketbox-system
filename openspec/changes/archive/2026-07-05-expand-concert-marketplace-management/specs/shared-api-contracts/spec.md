## ADDED Requirements

### Requirement: Canonical management concert contracts
The shared API package SHALL export strict Zod schemas and inferred types for management concert responses and role-appropriate create/update requests.

#### Scenario: Management response contains marketplace fields
- **WHEN** a backend adapter or web client validates a protected concert response
- **THEN** the canonical schema SHALL cover event type, legacy IDs/name, safe poster/banner assets, ordered artists, SEO fields, featured state, display order, and existing concert fields

#### Scenario: Organizer request excludes moderation
- **WHEN** an organizer create/update request is parsed
- **THEN** the organizer schema SHALL accept marketplace content fields and SHALL reject `isFeatured` and `displayOrder`

#### Scenario: Admin update request includes moderation
- **WHEN** an admin update request is parsed
- **THEN** the role-specific admin update schema SHALL accept marketplace content and validate optional `isFeatured` and non-negative integer `displayOrder`
- **AND** the shared package SHALL NOT export an admin concert-create schema

#### Scenario: Omitted event type remains compatible
- **WHEN** a create request omits `eventType`
- **THEN** the canonical contract SHALL preserve compatibility with a backend default of CONCERT

### Requirement: Canonical concert artist replacement contract
The shared API package SHALL export a strict replace-artists request schema containing an `artists` array of UUID artist IDs and non-negative integer display orders.

#### Scenario: Ordered replacement parses
- **WHEN** a request contains unique artists ordered contiguously from zero
- **THEN** the shared schema SHALL parse the request and infer its public wire type

#### Scenario: Duplicate or invalid ordering is rejected
- **WHEN** a request repeats an artist ID/order or contains negative/non-contiguous order
- **THEN** canonical validation SHALL reject the request before application execution

#### Scenario: Empty replacement is valid
- **WHEN** a request contains `{ "artists": [] }`
- **THEN** canonical validation SHALL accept it as the command to clear links

### Requirement: Canonical admin artist catalog contracts
The shared API package SHALL export strict schemas and inferred types for admin artist search parameters, paginated list response, create/update request, management artist response, and supported upload response metadata.

#### Scenario: Admin list includes status and safe assets
- **WHEN** an admin artist list response is parsed
- **THEN** each item SHALL include identity fields, ACTIVE/INACTIVE status, safe avatar/poster metadata, and pagination SHALL include total, limit, and offset

#### Scenario: Public and protected artist contracts remain distinct
- **WHEN** package exports are inspected
- **THEN** public artist list contracts SHALL remain active-only while protected management contracts SHALL represent inactive records

### Requirement: Management contract parity
Backend DTOs/mappers and the management web API client SHALL remain compatible with the canonical shared schemas.

#### Scenario: Backend adapter emits canonical response
- **WHEN** protected concert or artist HTTP adapter contract tests run
- **THEN** every success response SHALL parse through the corresponding shared response schema

#### Scenario: Web client validates management payloads
- **WHEN** `apps/web` receives a successful management concert or artist response
- **THEN** it SHALL validate the payload before returning data to feature code

#### Scenario: Shared package remains framework-independent
- **WHEN** management contracts are compiled
- **THEN** they SHALL not import NestJS, Prisma, React, backend domain types, or web feature types
