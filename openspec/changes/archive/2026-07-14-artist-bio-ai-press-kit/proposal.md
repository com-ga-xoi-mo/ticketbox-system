## Why

The backend already owns the artist-bio processing and review workflow, but concert managers cannot use it safely from the web app. The shared HTTP contract is missing, the web client loses error status and code information, and the queued `DRAFT` workflow state is not represented in the proposed UI, which would prevent reliable progress updates after upload or retry.

## What Changes

- Add the artist-bio request/response contracts and `ArtistBioStatus` schema/type exports to `@ticketbox/api-types`, matching the complete existing HTTP response payload.
- Build the shared API-types package before web consumers use the new contracts.
- Add stable, artist-bio-specific HTTP error envelopes so the web app can distinguish invalid press kits, invalid status transitions, missing jobs, missing concerts, and forbidden access.
- Preserve structured API errors in the web HTTP client and normalize a missing artist-bio job into an intentional no-job UI state.
- Add a role-aware TanStack Query client for organizer and admin upload, fetch, retry, publish, and reject operations.
- Poll queued (`DRAFT`) and active (`PROCESSING`) jobs, stopping as soon as the workflow reaches a review or terminal state.
- Add a Vietnamese “Tiểu sử nghệ sĩ (AI)” panel to concert management with upload, queued, processing, review, publication, rejection, retry, and failure states.
- Validate PDF uploads in the browser and add focused contract, backend error-mapping, client, hook, and component tests.
- Replace the raw-byte PDF text heuristic with standards-aware PDF extraction so the AI receives cleaned artist-profile text rather than PDF metadata or compressed stream data.

## Capabilities

### New Capabilities

<!-- No new capability: this change completes the existing artist-bio capability. -->

### Modified Capabilities

- `ai-artist-bio`: Extend the existing workflow with shared HTTP contracts, stable error semantics, role-aware concert-management client behavior, queued-state polling, Vietnamese UI states, and frontend verification.

## Impact

- `packages/api-types`: new artist-bio contract module and root exports.
- `packages/backend`: stable artist-bio HTTP error mapping, standards-aware PDF extraction, and regression tests; workflow persistence and transitions remain unchanged.
- `apps/web`: structured API error transport, artist-bio API client and hooks, concert-management panel, UI state/error mapping, and tests.
- Root build/test sequencing must build `@ticketbox/api-types` before web code that imports it.
