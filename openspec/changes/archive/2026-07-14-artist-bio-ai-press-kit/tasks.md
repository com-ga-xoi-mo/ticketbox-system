## 1. Shared artist-bio success contract

- [x] 1.1 Add `packages/api-types/src/artist-bio/artist-bio.contract.ts`.
- [x] 1.2 Define `ArtistBioStatusSchema` for all six durable workflow statuses and export its inferred type.
- [x] 1.3 Define `UploadArtistBioPressKitRequestSchema` for `originalName`, `contentType`, and `contentBase64`.
- [x] 1.4 Define a strict `ArtistBioResponseSchema` matching the existing HTTP mapper, including UUID, nullable, integer, and ISO timestamp constraints.
- [x] 1.5 Re-export artist-bio runtime schemas and inferred types from `packages/api-types/src/index.ts`.
- [x] 1.6 Add contract tests for every status, valid upload payloads, nullable response fields, malformed identifiers/timestamps, and invalid payloads.
- [x] 1.7 Run `npm run build:api-types` and verify web-package imports resolve from compiled output.

## 2. Stable backend artist-bio error envelope

- [x] 2.1 Define the expected artist-bio HTTP error codes: `INVALID_PRESS_KIT`, `ARTIST_BIO_STATUS_TRANSITION`, `ARTIST_BIO_NOT_FOUND`, `CONCERT_NOT_FOUND`, and the authorization failure code.
- [x] 2.2 Update the artist-bio HTTP error mapper to return `{ statusCode, code, message }` for invalid press kits and invalid workflow transitions.
- [x] 2.3 Update the mapper to distinguish missing artist-bio records from missing concerts while preserving forbidden responses.
- [x] 2.4 Add mapper or controller tests for each expected error status/code/message combination for organizer and admin routes.
- [x] 2.5 Verify the existing 20 MiB JSON body limit remains sufficient for a 5 MiB PDF encoded as base64.
- [x] 2.6 Replace the raw-byte `SimplePdfTextExtractor` heuristic with a standards-aware PDF parser that returns readable page text only.
- [x] 2.7 Preserve the existing `FAILED` workflow path when parsing fails or cleaned text is empty; never fall back to raw PDF bytes.
- [x] 2.8 Add a text-based compressed PDF press-kit fixture and extractor regression tests that exclude metadata and encoded stream fragments.
- [x] 2.9 Add processing-use-case coverage proving generated bios use extracted artist narrative and malformed/image-only PDFs fail safely.

## 3. Web error transport and role-explicit API client

- [x] 3.1 Add a typed shared `ApiError` that retains HTTP status, error code, and safe message without breaking existing `Error.message` callers.
- [x] 3.2 Update shared API-client tests for typed JSON errors, malformed error bodies, and existing unauthorized handling.
- [x] 3.3 Define a role-explicit artist-bio API factory or thin role adapters that keep React context out of the API module.
- [x] 3.4 Implement `uploadArtistBioPressKit(concertId, file)` with client-side validation, base64 encoding, and success-schema parsing.
- [x] 3.5 Implement `fetchArtistBio(concertId)` with success-schema parsing and `ARTIST_BIO_NOT_FOUND` normalization to a no-job result.
- [x] 3.6 Implement `retryArtistBio(concertId, id)` with success-schema parsing.
- [x] 3.7 Implement `publishArtistBio(concertId, id)` with success-schema parsing.
- [x] 3.8 Implement `rejectArtistBio(concertId, id)` with success-schema parsing.
- [x] 3.9 Add API-client tests for all five operations, organizer/admin paths, encoded upload payloads, response parsing, no-job normalization, and rethrown non-job errors.

## 4. Browser validation, Vietnamese error mapping, and query hooks

- [x] 4.1 Add a browser PDF validation helper for filename extension, MIME type, non-empty content, `%PDF-` signature, and 5 MiB maximum size.
- [x] 4.2 Add validation tests for every rejected condition and a valid PDF fixture.
- [x] 4.3 Add an artist-bio feature error mapper for invalid PDF, invalid status transition, forbidden access, missing job, and unknown failures.
- [x] 4.4 Add role- and session-scoped artist-bio query keys, including the authenticated organizer identity to prevent cache reuse across organizers.
- [x] 4.5 Add `useArtistBio` that represents a coded missing job as `null` and polls every 5 seconds for `DRAFT` and `PROCESSING` only.
- [x] 4.6 Configure `refetchIntervalInBackground: false`, `refetchOnWindowFocus: true`, and polling stop behavior for review and terminal states.
- [x] 4.7 Add upload, retry, publish, and reject mutations with pending states, immediate artist-bio cache updates or invalidation, and relevant concert-detail invalidation.
- [x] 4.8 Add hook tests for session-scoped keys, no-job behavior, `DRAFT`/`PROCESSING` polling, polling stop conditions, and mutation cache invalidation.

## 5. Concert-management artist-bio panel

- [x] 5.1 Create the shared `ArtistBioPanel` with Vietnamese heading, accessible PDF dropzone/file input, inline error area, and mutation-pending safeguards.
- [x] 5.2 Render the no-job state with “Tải lên PDF press kit” and upload action.
- [x] 5.3 Render the `REJECTED` state with a recreate/upload action.
- [x] 5.4 Render the queued `DRAFT` state with “Đang xếp hàng tạo tiểu sử…” and no duplicate action.
- [x] 5.5 Render the `PROCESSING` state with spinner and “Đang tạo tiểu sử…”.
- [x] 5.6 Render `READY_FOR_REVIEW` with generated-bio preview, “Duyệt & công khai”, and “Từ chối”.
- [x] 5.7 Render `PUBLISHED` with `publishedBio`, “Đã công khai” badge, and upload-again action.
- [x] 5.8 Render `FAILED` with error details, retry count/max attempts, formatted `nextRetryAt`, and retry eligibility/disabled state.
- [x] 5.9 Surface feature-mapped Vietnamese errors without displaying raw server text as primary UI copy.
- [x] 5.10 Compose the panel into the organizer concert detail view through `extraContent`.
- [x] 5.11 Compose the panel and existing admin review panel together in the admin detail view’s single `extraContent` slot.
- [x] 5.12 Add component tests for no-job, rejected, queued, processing, ready-for-review, published, and failed states; actions; disabled states; and localized errors.

## 6. Integrated verification

- [x] 6.1 Run focused API-types contract tests, backend artist-bio HTTP tests, and web artist-bio client/hook/component tests; fix failures.
- [x] 6.2 Run `npm run build:api-types` before the web test target and confirm the web workspace consumes the compiled contract package.
- [ ] 6.3 Run `npm run lint` and `npm run format:check`.
- [x] 6.4 Run the applicable repository test command and record the verification result in the implementation handoff.
- [x] 6.5 Run focused artist-bio extraction and processing tests using the compressed PDF fixture, then manually verify a generated bio from the sample press kit.
