## ADDED Requirements

### Requirement: Ticket cache wire contract

The `@ticketbox/api-types` package SHALL provide Zod schemas for the ticket cache endpoint response, covering both full and delta response shapes.

#### Scenario: Full ticket cache response is validated

- **WHEN** a mobile client receives a response from `GET /checkin/ticket-cache` without a `since` parameter
- **THEN** `TicketCacheFullResponseSchema` SHALL validate an object containing `entries` (array of `{hash: string, status: 'valid' | 'checked_in'}`), and `syncedAt` (ISO datetime string)

#### Scenario: Delta ticket cache response is validated

- **WHEN** a mobile client receives a response from `GET /checkin/ticket-cache` with a `since` parameter
- **THEN** `TicketCacheDeltaResponseSchema` SHALL validate an object containing `upserted` (array of `{hash: string, status: 'valid' | 'checked_in'}`), `voided` (array of strings), and `syncedAt` (ISO datetime string)

#### Scenario: Cache status is strictly typed

- **WHEN** a ticket cache entry contains a status value other than `valid` or `checked_in`
- **THEN** the schema SHALL reject the entry

#### Scenario: Ticket cache schemas are exported from package root

- **WHEN** a consumer imports from `@ticketbox/api-types`
- **THEN** `TicketCacheFullResponseSchema`, `TicketCacheDeltaResponseSchema`, and their inferred types SHALL be available as named exports

## MODIFIED Requirements

### Requirement: Batch sync wire contract

The `@ticketbox/api-types` package SHALL provide Zod schemas for `BatchSyncRequest` and `BatchSyncResponse`. The request gains an optional `since` field. The response gains an optional `cacheUpdates` field containing a delta of ticket hash changes.

#### Scenario: BatchSyncRequest schema is exported

- **WHEN** a consumer imports `BatchSyncRequestSchema` from `@ticketbox/api-types`
- **THEN** the schema SHALL be available and SHALL validate `events` (array, 1–100 items) and optional `since` (ISO datetime string)

#### Scenario: BatchSyncResponse schema is exported

- **WHEN** a consumer imports `BatchSyncResponseSchema` from `@ticketbox/api-types`
- **THEN** the schema SHALL be available and SHALL validate an array of per-event results plus an optional top-level `cacheUpdates` object with `upserted`, `voided`, and `syncedAt`

#### Scenario: Batch sync schemas follow the strict discriminated-union pattern

- **WHEN** a batch sync response event result contains an unrecognised status
- **THEN** `BatchSyncResponseSchema` SHALL reject the complete response
