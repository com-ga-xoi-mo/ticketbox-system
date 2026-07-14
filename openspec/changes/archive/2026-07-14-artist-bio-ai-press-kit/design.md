## Context

The backend artist-bio module already owns PDF validation, durable `artist_bios` workflow state, queue processing, authorization, review transitions, public-bio publication, and role-prefixed HTTP endpoints. Upload and retry persist a record as `DRAFT`, enqueue a worker job, and later transition it to `PROCESSING`; therefore `DRAFT` is a queued active state rather than an empty-state equivalent.

The shared `@ticketbox/api-types` package has no artist-bio contract. The web app has role-specific concert pages, a shared detail-panel extension point, and TanStack Query hooks, but no artist-bio client or panel. The existing shared web HTTP client discards error status and code data, while the artist-bio HTTP mapper emits generic Nest exceptions without a stable error code. Those two behaviors prevent the UI from safely recognizing a missing job as an expected empty state or from mapping invalid workflow transitions accurately.

## Goals / Non-Goals

**Goals:**

- Define and export a complete, framework-independent artist-bio success contract.
- Define stable artist-bio HTTP error codes and preserve them in the web client.
- Provide organizer and admin flows through one role-explicit client abstraction and session-safe query keys.
- Treat `DRAFT` as queued work and poll both `DRAFT` and `PROCESSING` every five seconds only while the detail panel is active.
- Render every workflow state in Vietnamese, prevent unavailable retry actions, and keep generated text private until publication succeeds.
- Cover backend error mapping, shared client error transport, contracts, API functions, hooks, validation, and panel states with focused tests.
- Extract readable text from common text-based PDF press kits before cleaning and AI generation.

**Non-Goals:**

- Changing the AI provider, queue, database schema, retry policy, or artist-bio workflow transitions.
- Adding a new artist-bio page or public audience editing flow; the panel remains embedded in concert management.
- Supporting non-PDF press kits, client-side AI generation, optimistic publication state, or a global replacement for every API error envelope.

## Decisions

### 1. Add an exact framework-independent success contract

Create `packages/api-types/src/artist-bio/artist-bio.contract.ts` with `ArtistBioStatusSchema`, `UploadArtistBioPressKitRequestSchema`, `ArtistBioResponseSchema`, and inferred types. `ArtistBioStatusSchema` SHALL enumerate `DRAFT`, `PROCESSING`, `READY_FOR_REVIEW`, `PUBLISHED`, `FAILED`, and `REJECTED`.

`ArtistBioResponseSchema` SHALL mirror the existing `toArtistBioResponse` HTTP payload exactly: `id`, `concertId`, `pressKitAssetId`, `status`, `generatedBio`, `publishedBio`, `provider`, `errorMessage`, `retryCount`, `maxAttempts`, `lastAttemptedAt`, `nextRetryAt`, `requestedById`, `reviewedById`, `publishedAt`, `createdAt`, and `updatedAt`. IDs are UUID strings; timestamps are ISO date-time strings; nullable fields remain nullable. Runtime schemas and inferred types SHALL be re-exported from the package root.

This preserves the dependency-leaf boundary and gives the backend and web app one canonical success payload without leaking domain or Prisma types.

### 2. Introduce a stable artist-bio error envelope

The artist-bio HTTP error mapper SHALL return `{ statusCode, code, message }` for expected artist-bio failures. It SHALL emit `INVALID_PRESS_KIT` for validation failures, `ARTIST_BIO_STATUS_TRANSITION` for invalid retry/publish/reject transitions, `ARTIST_BIO_NOT_FOUND` when a concert has no artist-bio record or an operation targets a missing job, `CONCERT_NOT_FOUND` for a missing concert, and a forbidden-access code for authorization failures.

The web shared client SHALL expose a typed `ApiError` that preserves HTTP status, code, and a safe message. Existing callers that only consume `Error.message` remain compatible. The artist-bio feature SHALL interpret only `ARTIST_BIO_NOT_FOUND` returned by its GET operation as `null`; all other failures remain errors. This prevents a missing concert from being rendered as a no-job upload surface.

### 3. Keep endpoint selection explicit and role-safe

Use a role-explicit artist-bio API factory or thin role-specific adapters. The object returned to hooks SHALL expose the requested five operations with stable signatures: `uploadArtistBioPressKit(concertId, file)`, `fetchArtistBio(concertId)`, `retryArtistBio(concertId, id)`, `publishArtistBio(concertId, id)`, and `rejectArtistBio(concertId, id)`.

Hooks supply the authenticated management scope rather than allowing an API module to read React context. Organizer operations use `/organizer/concerts/:concertId/artist-bio`; admin operations use `/admin/concerts/:concertId/artist-bio`. Query keys SHALL include role and session identity for organizer data, matching existing concert-cache isolation.

### 4. Poll active queued and processing work

`useArtistBio(concertId)` SHALL poll every 5 seconds when the parsed status is `DRAFT` or `PROCESSING`, use `refetchIntervalInBackground: false`, and retain `refetchOnWindowFocus: true`. Polling stops for `READY_FOR_REVIEW`, `PUBLISHED`, `FAILED`, and `REJECTED`. A mutation response that is `DRAFT` MUST therefore immediately enter the polling path after cache update or invalidation.

The feature distinguishes the two active states in copy:

- `DRAFT`: “Đang xếp hàng tạo tiểu sử…”
- `PROCESSING`: “Đang tạo tiểu sử…”

### 5. Compose one state-driven management panel

Create a shared `ArtistBioPanel` rendered through the concert detail panel extension point for both organizer and admin. For admin, compose it with the existing review panel inside the single `extraContent` slot.

- No record or `REJECTED`: PDF dropzone and upload/recreate action.
- `DRAFT`: queued indicator with no duplicate upload/retry action.
- `PROCESSING`: processing spinner with no duplicate upload/retry action.
- `READY_FOR_REVIEW`: generated-bio preview with “Duyệt & công khai” and “Từ chối”.
- `PUBLISHED`: published text, “Đã công khai” badge, and upload-again action.
- `FAILED`: error message, retry count/max attempts, formatted next retry time, and a retry action only when attempts remain and `nextRetryAt` has passed or is absent.

The panel disables mutations while pending and never labels `generatedBio` as public before the publish mutation succeeds.

### 6. Validate before encoding and localize errors at the feature boundary

The browser validation helper SHALL require a `.pdf` filename, `application/pdf` MIME type, non-empty content, a `%PDF-` signature in the first five bytes, and a maximum size of 5 MiB before converting the file to base64. The API remains the final validator.

The feature error mapper SHALL translate `INVALID_PRESS_KIT` to “File không hợp lệ (phải là PDF, không rỗng và không vượt quá 5 MB)”, `ARTIST_BIO_STATUS_TRANSITION` to “Không thể publish/reject ở trạng thái hiện tại”, 403 to a no-permission message, and other safe failures to Vietnamese fallback copy. `ARTIST_BIO_NOT_FOUND` from the GET operation is not an error surface; it produces the no-job dropzone.

### 7. Test behavior without worker infrastructure

Contract tests will validate representative success payloads and nullability. Backend tests will verify status/code/message error envelopes. Shared-client tests will verify typed error preservation. Feature API tests will cover all five operations, both endpoint prefixes, base64 encoding, successful response parsing, and no-job normalization. Hook tests will use fake timers for `DRAFT`/`PROCESSING` polling and session-scoped keys. Component tests will cover the entire panel state matrix, mutation availability, localized errors, and admin composition.

### 8. Parse PDF structure before cleaning or generation

The current raw-byte regular-expression approach is not a valid PDF text extractor: it treats metadata and compressed stream bytes as text. Replace it with a maintained, standards-aware Node PDF parser. The adapter SHALL return page text only; `cleanExtractedPdfText` remains responsible for normalizing whitespace and enforcing the configured character limit.

If parsing fails or cleanup produces no usable text, `ProcessArtistBioUseCase` SHALL follow its existing failure path and persist a `FAILED` job. It SHALL never fall back to raw PDF bytes. A regression fixture generated by a standard PDF producer with compressed streams SHALL prove that the extracted source contains the artist narrative and excludes document metadata such as producer, title, author, and creation timestamps.

## Risks / Trade-offs

- [Queued work could appear idle] → Treat `DRAFT` as an active queued state and poll it until the worker changes the status.
- [Base64 increases request size] → Keep the existing JSON endpoint, enforce the 5 MiB client limit, and rely on the already configured 20 MiB API JSON body limit plus server-side validation.
- [Stable error envelopes alter HTTP payloads] → Scope the envelope to artist-bio expected failures, maintain `message`, and deploy backend support before relying on codes in the web client.
- [Role-specific cache reuse could expose stale data] → Include organizer session identity and role in query keys.
- [Generated text could be mistaken for public content] → Separate preview and published views, and only show the public badge after `PUBLISHED`.
- [Retry actions can fail before their scheduled time] → Disable unavailable retry controls using `retryCount`, `maxAttempts`, and `nextRetryAt`; retain the server as the final authority.
- [Raw PDF bytes can look printable] → Use a structured parser and reject unusable parsed text instead of allowing metadata or compressed content into the generator prompt.

## Migration Plan

1. Add the stable backend error envelope and its tests while preserving existing human-readable messages.
2. Add and build the shared API-types success contract.
3. Add shared-client typed error transport, then implement the role-aware web client, hooks, and panel.
4. Deploy the backend before or together with the web app. The web feature SHALL retain a safe status-based fallback during rollout if a code is absent.
5. Roll back by removing the panel/client bundle; no database migration or destructive data operation is introduced.

## Resolved Decisions

- **Polling interval:** Use a fixed 5-second interval for `DRAFT` and `PROCESSING`, disable background-tab polling, stop when work reaches a review or terminal state, and refetch on window focus.
- **Admin support:** Support organizer and admin concert-management flows with one shared panel and role-explicit endpoint/cache selection. Existing backend admin endpoints authorize the required operations.
- **No-job semantics:** Only a coded `ARTIST_BIO_NOT_FOUND` response from the artist-bio GET operation becomes the normal empty state; other 404 responses remain actionable errors.
