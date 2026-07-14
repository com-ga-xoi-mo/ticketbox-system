## ADDED Requirements

### Requirement: Shared artist-bio HTTP success contracts

The system SHALL define framework-independent Zod contracts in `@ticketbox/api-types` for artist-bio upload requests, artist-bio responses, and every `ArtistBioStatus` value. The package root SHALL export each runtime schema and inferred type, and the package SHALL be built before web consumers compile or test against it.

#### Scenario: Consumer imports artist-bio contracts

- **WHEN** a web consumer imports from `@ticketbox/api-types`
- **THEN** it SHALL receive `UploadArtistBioPressKitRequestSchema`, `ArtistBioResponseSchema`, `ArtistBioStatusSchema`, and their inferred types from the package root

#### Scenario: Response contract mirrors the HTTP response

- **WHEN** `ArtistBioResponseSchema` parses a backend response
- **THEN** it SHALL validate `id`, `concertId`, `pressKitAssetId`, `status`, `generatedBio`, `publishedBio`, `provider`, `errorMessage`, `retryCount`, `maxAttempts`, `lastAttemptedAt`, `nextRetryAt`, `requestedById`, `reviewedById`, `publishedAt`, `createdAt`, and `updatedAt`
- **AND** it SHALL accept nullable fields only where the HTTP response can emit `null`
- **AND** it SHALL validate identifiers as UUID strings and timestamps as ISO date-time strings

#### Scenario: Shared package is built before web use

- **WHEN** the web app builds or runs tests that import artist-bio contracts
- **THEN** the root workflow SHALL build `@ticketbox/api-types` first and resolve the package through its compiled root output

### Requirement: Stable artist-bio HTTP error semantics

The artist-bio HTTP adapter SHALL return expected artist-bio failures as a JSON envelope containing `statusCode`, `code`, and `message`. The web client SHALL preserve those fields in a typed error for feature-level handling.

#### Scenario: Invalid press kit returns a stable code

- **WHEN** the artist-bio upload is rejected because the filename, MIME type, content, signature, or size is invalid
- **THEN** the API SHALL return HTTP 400 with code `INVALID_PRESS_KIT`

#### Scenario: Invalid workflow transition returns a stable code

- **WHEN** retry, publish, or reject is attempted from an invalid artist-bio status
- **THEN** the API SHALL return HTTP 409 with code `ARTIST_BIO_STATUS_TRANSITION`

#### Scenario: Missing job is distinct from missing concert

- **WHEN** an authorized manager fetches an existing concert that has no artist-bio record
- **THEN** the API SHALL return HTTP 404 with code `ARTIST_BIO_NOT_FOUND`
- **AND WHEN** the concert itself does not exist
- **THEN** the API SHALL return HTTP 404 with code `CONCERT_NOT_FOUND`

#### Scenario: Web client preserves structured errors

- **WHEN** an artist-bio HTTP request receives an expected error envelope
- **THEN** the web client SHALL expose the HTTP status, error code, and safe message to the feature error mapper

### Requirement: Role-aware artist-bio API client

The web app SHALL provide a role-explicit artist-bio client exposing `uploadArtistBioPressKit(concertId, file)`, `fetchArtistBio(concertId)`, `retryArtistBio(concertId, id)`, `publishArtistBio(concertId, id)`, and `rejectArtistBio(concertId, id)`. The client SHALL validate successful responses with `ArtistBioResponseSchema` and SHALL not read React context directly.

#### Scenario: Organizer invokes artist-bio operations

- **WHEN** an organizer invokes an artist-bio operation for a concert they manage
- **THEN** the client SHALL use `/organizer/concerts/:concertId/artist-bio` and its matching retry, publish, or reject path

#### Scenario: Admin invokes artist-bio operations

- **WHEN** an admin invokes an artist-bio operation
- **THEN** the client SHALL use `/admin/concerts/:concertId/artist-bio` and its matching retry, publish, or reject path

#### Scenario: Client uploads a valid press kit

- **WHEN** a manager calls `uploadArtistBioPressKit` with a valid PDF file
- **THEN** the client SHALL POST the original name, `application/pdf` content type, and base64 content
- **AND** it SHALL return the parsed artist-bio response

#### Scenario: Missing artist-bio job becomes an empty result

- **WHEN** `fetchArtistBio` receives HTTP 404 with code `ARTIST_BIO_NOT_FOUND`
- **THEN** it SHALL return a no-job result rather than throw an error
- **AND WHEN** it receives another error or 404 code
- **THEN** it SHALL preserve the error for the caller

### Requirement: Active artist-bio jobs are polled

The web app SHALL use a session- and role-scoped TanStack Query key for an artist-bio record and SHALL poll every 5 seconds only while the durable record is queued or processing.

#### Scenario: Queued job is polled

- **WHEN** the artist-bio query returns status `DRAFT`
- **THEN** the hook SHALL refetch every 5 seconds
- **AND** it SHALL render the job as queued rather than as an upload empty state

#### Scenario: Processing job is polled

- **WHEN** the artist-bio query returns status `PROCESSING`
- **THEN** the hook SHALL refetch every 5 seconds

#### Scenario: Polling stops after processing

- **WHEN** the status changes to `READY_FOR_REVIEW`, `PUBLISHED`, `FAILED`, or `REJECTED`
- **THEN** the hook SHALL stop interval refetching
- **AND** it SHALL not refetch at an interval while the browser tab is in the background

### Requirement: Artist bios are generated from extracted press-kit text

The backend SHALL parse an uploaded PDF with a standards-aware text extraction implementation before it cleans text and sends it to the configured AI generator. It SHALL NOT treat raw PDF bytes, PDF object metadata, or compressed content streams as extracted artist text.

#### Scenario: A common compressed PDF produces meaningful source text

- **WHEN** an authorized manager uploads a valid, text-based PDF press kit produced by a standard PDF generator
- **THEN** the processing worker SHALL extract the readable page text before applying whitespace cleanup and input-length limits
- **AND** the generated biography SHALL be based on the press-kit narrative rather than PDF producer, author, title, timestamps, object syntax, or encoded stream data

#### Scenario: A PDF does not contain usable text

- **WHEN** the parser cannot read the PDF or it yields no usable text after cleanup
- **THEN** the worker SHALL transition the job to `FAILED` with a safe processing error
- **AND** it SHALL NOT create a `READY_FOR_REVIEW` bio from metadata or raw PDF bytes

### Requirement: Concert-management artist-bio panel

The web app SHALL render a Vietnamese “Tiểu sử nghệ sĩ (AI)” panel in organizer and admin concert management for the selected concert. The panel SHALL render controls and content according to the durable artist-bio status.

#### Scenario: No job or rejected job

- **WHEN** no artist-bio record exists or the record status is `REJECTED`
- **THEN** the panel SHALL show a PDF press-kit dropzone labeled “Tải lên PDF press kit” and an upload/recreate action

#### Scenario: Job is queued

- **WHEN** the record status is `DRAFT`
- **THEN** the panel SHALL show “Đang xếp hàng tạo tiểu sử…” and SHALL not show duplicate upload or retry actions

#### Scenario: Job is processing

- **WHEN** the record status is `PROCESSING`
- **THEN** the panel SHALL show a spinner and “Đang tạo tiểu sử…”

#### Scenario: Bio is ready for review

- **WHEN** the record status is `READY_FOR_REVIEW`
- **THEN** the panel SHALL preview `generatedBio` and show “Duyệt & công khai” and “Từ chối” actions

#### Scenario: Bio is published

- **WHEN** the record status is `PUBLISHED`
- **THEN** the panel SHALL show `publishedBio`, a badge labeled “Đã công khai”, and an action to upload a new press kit

#### Scenario: Job failed

- **WHEN** the record status is `FAILED`
- **THEN** the panel SHALL show `errorMessage`, `retryCount`, `maxAttempts`, and `nextRetryAt` when available
- **AND** it SHALL enable “Thử lại” only when retry attempts remain and `nextRetryAt` is absent or no later than the current time

### Requirement: Client-side PDF validation and localized artist-bio errors

The web app SHALL validate a press-kit file before encoding or sending it. It SHALL map known artist-bio API failures to safe Vietnamese messages without exposing raw server details as the primary UI copy.

#### Scenario: Invalid PDF is rejected locally

- **WHEN** a selected file is not named with a `.pdf` extension, does not have MIME type `application/pdf`, is empty, lacks the `%PDF-` signature, or exceeds 5 MiB
- **THEN** the client SHALL reject it without making an API request and SHALL display a Vietnamese invalid-file message

#### Scenario: Known API failures are mapped

- **WHEN** the API returns code `INVALID_PRESS_KIT`
- **THEN** the panel SHALL display “File không hợp lệ (phải là PDF, không rỗng và không vượt quá 5 MB)” or equivalent complete Vietnamese validation copy
- **AND WHEN** the API returns code `ARTIST_BIO_STATUS_TRANSITION`
- **THEN** the panel SHALL display “Không thể publish/reject ở trạng thái hiện tại”
- **AND WHEN** the API returns HTTP 403
- **THEN** the panel SHALL display a no-permission message

### Requirement: Artist-bio verification

The implementation SHALL include automated tests for the shared success contract, backend error mapping, web error transport, PDF validation helper, all five artist-bio API operations, active-state polling, and every artist-bio panel state.

#### Scenario: Client and hook tests cover workflow boundaries

- **WHEN** the artist-bio client and hook test suites run
- **THEN** they SHALL verify organizer/admin endpoint selection, base64 upload payloads, response parsing, coded no-job normalization, structured error handling, session-scoped keys, and `DRAFT`/`PROCESSING` polling stop conditions

#### Scenario: Component tests cover the state matrix

- **WHEN** the artist-bio panel component test suite runs
- **THEN** it SHALL verify no-job, rejected, queued, processing, ready-for-review, published, and failed states, localized errors, retry availability, and available actions

#### Scenario: Backend tests guard PDF extraction quality

- **WHEN** artist-bio backend tests run
- **THEN** they SHALL use a text-based compressed PDF fixture and verify that the extracted source contains expected narrative text
- **AND** they SHALL verify that PDF metadata and encoded stream fragments do not become the generated biography source
