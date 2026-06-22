## ADDED Requirements

### Requirement: Batch sync wire contract

The shared contract package SHALL provide Zod schemas and inferred TypeScript types for the batch sync request and response as the canonical runtime definitions for the `POST /checkin/sync` endpoint.

#### Scenario: BatchSyncRequest schema is exported

- **WHEN** a consumer imports from `@ticketbox/api-types`
- **THEN** the package SHALL export `BatchSyncRequestSchema`, `BatchSyncEventSchema`, and the inferred `BatchSyncRequest` and `BatchSyncEvent` types

#### Scenario: BatchSyncResponse schema is exported

- **WHEN** a consumer imports from `@ticketbox/api-types`
- **THEN** the package SHALL export `BatchSyncResponseSchema`, `BatchSyncEventResultSchema`, and the inferred `BatchSyncResponse` and `BatchSyncEventResult` types

#### Scenario: Batch sync schemas follow the strict discriminated-union pattern

- **WHEN** the batch sync response result is validated
- **THEN** the result schema SHALL use a discriminated union on `status` with strict mode, consistent with the existing `OnlineScanResponseSchema`

#### Scenario: Batch sync request is bounded and correlatable

- **WHEN** `BatchSyncRequestSchema` validates a request
- **THEN** it SHALL allow at most 100 events, reject duplicate `localId` values, bound all variable-length strings, and require `qrPayloadHash` as lowercase 64-character SHA-256 hexadecimal

#### Scenario: Batch sync types remain framework-independent

- **WHEN** the batch sync contract files are compiled
- **THEN** they SHALL depend only on Zod and SHALL NOT import backend, mobile, NestJS, React Native, Prisma, or application workspace code

#### Scenario: Mobile validates batch sync responses

- **WHEN** the mobile sync service receives a batch sync response
- **THEN** it SHALL validate the response payload with `BatchSyncResponseSchema` before processing results

#### Scenario: Backend response mapper for batch sync is contract-tested

- **WHEN** the backend maps batch sync use-case results to wire format
- **THEN** contract tests SHALL validate every response variant with the corresponding shared Zod schema

#### Scenario: Backend request validation uses the canonical schema

- **WHEN** the NestJS HTTP adapter receives `POST /checkin/sync`
- **THEN** it SHALL validate the body directly with `BatchSyncRequestSchema` through a Zod adapter pipe and SHALL NOT maintain an equivalent class-validator DTO

#### Scenario: Response mapping remains side-effect free

- **WHEN** the backend maps committed per-event outcomes into `BatchSyncResponse`
- **THEN** it SHALL use a deterministic side-effect-free mapper covered by contract tests and SHALL NOT add runtime response parsing after accepted transactions have committed
