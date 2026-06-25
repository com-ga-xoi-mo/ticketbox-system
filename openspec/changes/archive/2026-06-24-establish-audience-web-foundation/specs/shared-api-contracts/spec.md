## ADDED Requirements

### Requirement: Audience public catalog wire contracts
The shared contract package SHALL provide framework-independent Zod schemas and inferred TypeScript types for the public audience concert catalog responses consumed by the audience web app.

#### Scenario: Public concert list contract is exported
- **WHEN** a consumer imports from `@ticketbox/api-types`
- **THEN** the package exports schemas and inferred types for the `GET /concerts` public concert list response

#### Scenario: Public concert detail contract is exported
- **WHEN** a consumer imports from `@ticketbox/api-types`
- **THEN** the package exports schemas and inferred types for the `GET /concerts/:slug` public concert detail response

#### Scenario: Public concert availability contract is exported
- **WHEN** a consumer imports from `@ticketbox/api-types`
- **THEN** the package exports schemas and inferred types for the `GET /concerts/:slug/availability` public concert availability response

#### Scenario: Audience app validates public catalog responses
- **WHEN** the audience web app receives a successful public catalog response
- **THEN** it validates the payload with the matching shared schema before returning data to route or feature code

#### Scenario: Public catalog contracts stay framework-independent
- **WHEN** public catalog contract files are compiled
- **THEN** they depend only on framework-independent contract dependencies such as Zod
- **AND** they do not import backend, React, Vite, Prisma, NestJS, or app-specific UI code

#### Scenario: Backend public catalog mapper is contract-tested
- **WHEN** the backend maps public concert catalog use-case results to HTTP responses consumed by the audience app
- **THEN** contract tests validate representative list, detail, and availability payloads with the corresponding shared schemas
