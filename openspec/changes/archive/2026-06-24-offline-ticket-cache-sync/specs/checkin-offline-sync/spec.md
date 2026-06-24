## MODIFIED Requirements

### Requirement: Batch sync API contract

The `@ticketbox/api-types` package SHALL provide Zod schemas for `BatchSyncRequest` and `BatchSyncResponse` following the same validation strategy as the online scan contract. The request SHALL include an optional `since` timestamp for delta cache computation. The response SHALL include an optional `cacheUpdates` field containing ticket hash changes since the `since` timestamp.

#### Scenario: BatchSyncRequest validates a bounded array of offline events

- **WHEN** a batch sync request is validated by the shared schema
- **THEN** `BatchSyncRequestSchema` SHALL require a non-empty `events` array of at most 100 items, each with `localId`, `assignmentId`, `concertId`, `qrPayloadHash`, `scannedAt`, `deviceId`, and optional `gate`

#### Scenario: BatchSyncRequest accepts optional since timestamp

- **WHEN** a batch sync request includes a `since` field with a valid ISO datetime string
- **THEN** `BatchSyncRequestSchema` SHALL accept it and pass it through to the server for delta cache computation

#### Scenario: BatchSyncResponse validates per-event results

- **WHEN** a batch sync response is validated by the shared schema
- **THEN** `BatchSyncResponseSchema` SHALL accept a top-level array of per-event results, each with `localId` and `status` discriminated as `accepted`, `duplicate`, `invalid`, `conflict`, or `unassigned`

#### Scenario: BatchSyncResponse includes optional cacheUpdates

- **WHEN** a batch sync response includes a `cacheUpdates` field
- **THEN** `BatchSyncResponseSchema` SHALL validate it as an object with `upserted` (array of `{hash: string, status: 'valid' | 'checked_in'}`), `voided` (array of strings), and `syncedAt` (ISO datetime string)

#### Scenario: Batch sync schemas follow the strict discriminated-union pattern

- **WHEN** a batch sync response event result contains an unrecognised status
- **THEN** `BatchSyncResponseSchema` SHALL reject the complete response

### Requirement: Backend batch sync endpoint

The backend SHALL expose `POST /checkin/sync` for authenticated `CHECKIN_STAFF` users to submit offline scan events and receive per-event results. The endpoint SHALL also accept an optional `since` timestamp and return `cacheUpdates` computed AFTER processing the submitted events, so the returned delta reflects the just-applied scans.

#### Scenario: Batch sync processes events and returns per-event results

- **WHEN** an authenticated `CHECKIN_STAFF` user submits a valid `BatchSyncRequest` to `POST /checkin/sync`
- **THEN** the system SHALL process each event through the same acceptance logic as online scan and return a `BatchSyncResponse` with one result per submitted event in the same order

#### Scenario: Cache delta is computed after events are processed

- **WHEN** a `BatchSyncRequest` includes a `since` timestamp
- **THEN** the system SHALL first apply all submitted scan events, then compute the ticket hash delta from `since` to now, and return both `eventResults` and `cacheUpdates` in a single response — ensuring the returned cache already reflects the just-processed scans

#### Scenario: Missing since omits cacheUpdates

- **WHEN** a `BatchSyncRequest` does not include a `since` field
- **THEN** the system SHALL return per-event results only and SHALL omit `cacheUpdates` from the response

#### Scenario: Empty batch returns empty results

- **WHEN** a batch sync request contains an empty array
- **THEN** the system SHALL return HTTP 400

#### Scenario: Oversized batch is rejected

- **WHEN** a batch sync request contains more than 100 events
- **THEN** the system SHALL return HTTP 400 before processing any events
