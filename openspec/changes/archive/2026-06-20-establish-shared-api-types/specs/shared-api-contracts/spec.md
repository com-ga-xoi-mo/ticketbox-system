## ADDED Requirements

### Requirement: Shared public HTTP contract package
The system SHALL provide an npm workspace package named `@ticketbox/api-types` as the canonical source for the scoped authentication, staff profile, staff assignment, and online scan HTTP wire contracts.

#### Scenario: Backend and mobile consume the same contract
- **WHEN** the backend HTTP adapter produces or the mobile API client consumes a scoped API payload
- **THEN** both sides SHALL use the corresponding public schema and type exported by `@ticketbox/api-types`

#### Scenario: Public exports are controlled
- **WHEN** a consumer imports from `@ticketbox/api-types`
- **THEN** the package SHALL expose only the supported public schemas, inferred wire types, and API code values through its root entrypoint

#### Scenario: Consumers import compiled package output
- **WHEN** `@ticketbox/api-types` is built or resolved by a workspace consumer
- **THEN** its root export SHALL resolve matching runtime JavaScript and TypeScript declarations from `dist`, and consumers SHALL NOT deep-import `src` or depend on a repository-only TypeScript path alias

#### Scenario: Shared package is built before consumers
- **WHEN** root development, build, test, or verification commands start a backend or mobile consumer that imports `@ticketbox/api-types`
- **THEN** the shared package SHALL be built first and its package-root import SHALL resolve in both the NestJS runtime path and an Expo Metro bundle

### Requirement: Shared package preserves architecture boundaries
The shared contract package SHALL contain only framework-independent public HTTP schemas, request and response types, and API code values, and SHALL NOT contain or expose backend domain/application/infrastructure types or mobile feature/UI types.

#### Scenario: Backend inner layers remain independent
- **WHEN** backend domain or application code is compiled or checked by the dependency-boundary test
- **THEN** it SHALL NOT depend on `@ticketbox/api-types`

#### Scenario: Shared contract package remains a dependency leaf
- **WHEN** workspace dependencies and imports are inspected
- **THEN** `@ticketbox/api-types` SHALL depend only on framework-independent contract dependencies such as Zod and SHALL NOT import backend, mobile, NestJS, React Native, Prisma, or application workspace code

#### Scenario: Contract consumers depend toward the shared package
- **WHEN** backend and mobile consume a scoped public HTTP contract
- **THEN** the backend HTTP adapter and mobile API client MAY import `@ticketbox/api-types`, while the shared package SHALL NOT import either consumer and backend domain/application layers SHALL remain independent of the shared package

#### Scenario: Domain and infrastructure types do not leak
- **WHEN** package exports are inspected
- **THEN** they SHALL NOT expose backend `Role`, Prisma models or enums, repositories, use cases, NestJS types, network-client implementations, React Native components, stores, or UI state

#### Scenario: Public role code is distinct from domain role
- **WHEN** a role value crosses an HTTP boundary
- **THEN** it SHALL use the public `RoleCode` contract without relocating or replacing the backend domain `Role` or persisted database role enum

### Requirement: Canonical runtime wire validation
The shared contract package SHALL provide framework-independent Zod schemas as the canonical runtime definitions for its scoped wire contracts and SHALL infer the corresponding TypeScript wire types from those schemas.

#### Scenario: Mobile validates successful responses
- **WHEN** the mobile API client receives a successful login, profile, assignment, or online scan payload
- **THEN** it SHALL validate the payload with the corresponding shared schema before returning data to mobile feature code

#### Scenario: Assignment response is a raw array
- **WHEN** the shared active-assignment response is produced or validated
- **THEN** it SHALL be a raw array of assignment items, use `[]` for no active assignments, and reject an envelope object such as `{ assignments: [...] }`

#### Scenario: Online scan request requires device identity
- **WHEN** an online scan request is validated by the shared schema
- **THEN** `deviceId` SHALL be required, trimmed, non-empty, and no longer than 160 characters

#### Scenario: Optional gate normalization matches the backend DTO
- **WHEN** an online scan request includes optional `gate`
- **THEN** both the canonical shared schema and the NestJS DTO SHALL trim surrounding whitespace, reject a blank-after-trim value, preserve omission as valid, and pass the same normalized value to check-in processing

#### Scenario: Online scan validation enforces status-specific fields
- **WHEN** an online scan response is validated
- **THEN** the shared schema SHALL discriminate on `status`, require `ticketId` and `checkedInAt` for `accepted`, require an invalid-ticket reason code for `invalid`, require an assignment reason code for `unassigned`, and reject fields or reason codes that do not belong to that outcome

#### Scenario: Optional scan metadata has stable JSON semantics
- **WHEN** optional ticket or check-in metadata is unavailable for a scan response
- **THEN** the backend SHALL omit those optional fields rather than emit `null`, and the mobile parser SHALL apply the same contract

#### Scenario: Existing NestJS request validation remains compatible
- **WHEN** a scoped backend request continues to use a NestJS `class-validator` DTO during migration
- **THEN** contract parity tests SHALL prove that the DTO constraints remain compatible with the canonical shared request schema

#### Scenario: Backend response mapper is pure and contract-tested
- **WHEN** a backend HTTP adapter maps a scoped application result to a shared response type
- **THEN** the mapper SHALL be deterministic and side-effect-free, and contract tests SHALL validate every response variant with the corresponding shared Zod schema

#### Scenario: Side-effecting scan avoids post-commit response parsing
- **WHEN** `POST /checkin/scan` has committed an accepted check-in
- **THEN** the backend SHALL rely on invariant-bearing local result types and the contract-tested pure mapper rather than introduce a runtime response-schema parse that can fail after the commit

#### Scenario: Authorization failures are not shared business contracts
- **WHEN** a scoped endpoint returns HTTP `401` or `403`
- **THEN** the mobile client SHALL classify the failure by HTTP status before success-schema parsing, and `@ticketbox/api-types` SHALL NOT define the authorization error body or include `unauthorized` in a successful business response

### Requirement: Contract compatibility is tested across the HTTP boundary
The system SHALL verify shared contract compatibility using package schema tests, backend HTTP adapter contract tests, mobile API-client tests, and an integration test that does not substitute a fake mobile API client for the backend boundary.

#### Scenario: Full check-in staff flow is compatible
- **WHEN** the integration suite runs the real mobile HTTP client against the backend HTTP routes for login, authenticated profile retrieval, active assignment listing, assignment selection, and online scan submission
- **THEN** every response SHALL validate against the shared contract and the final scan result SHALL map to the expected mobile state

#### Scenario: Duplicate wire types are removed safely
- **WHEN** migration to the shared package is complete
- **THEN** old duplicate wire types SHALL be removed only after usage inventory, build, typecheck, unit, HTTP contract, and integration tests pass
