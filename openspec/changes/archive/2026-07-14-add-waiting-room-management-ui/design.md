## Context

The Virtual Waiting Room already persists one optional configuration per concert in PostgreSQL and keeps all queue, load, admission, and effective-active state in Redis. `OrganizerWaitingRoomController` exposes one shared endpoint family to `ORGANIZER` and `ADMIN`, and `@ticketbox/api-types` already exports the complete request and response schemas. The audience checkout flow is complete.

Four gaps shape this change:

1. `apps/web` has no waiting-room management UI, while both concert edit pages already use local `FormSection` wrappers inside a page-level `<form>`.
2. Waiting-room management currently checks roles but does not pass the authenticated actor into its use cases. Unlike other concert-management operations, it therefore does not enforce organizer ownership.
3. `GET /organizer/waiting-room/:concertId` returns persisted configuration only. It does not expose Redis load, queue length, admitted count, `effectiveActive`, or an activation reason.
4. `apps/web/src/shared/api/client.ts` reduces all non-2xx responses to plain `Error`, so the UI cannot reliably recognize an expected 404 without matching error text or duplicating the authenticated fetch path.

The repository already supplies the integration patterns this change needs: `AuthorizeConcertManagementUseCase` is exported from `AuthModule`, role-specific concert queries carry session scope, response payloads are parsed with shared Zod schemas, and both concert edit pages can host the same shared child component.

## Goals / Non-Goals

**Goals:**

- Give admins and organizers one consistent, accessible waiting-room configuration and operations section in existing concert edit pages.
- Keep draft values, persisted values, and immediate override mutations behaviorally distinct.
- Make the unconfigured state safe and explicit: local defaults are disabled and no write occurs until the user saves.
- Reuse existing endpoints and contracts, and keep response validation at the frontend boundary.
- Apply the repository's existing organizer-ownership/admin-override policy to all waiting-room management operations.
- Preserve HTTP status for safe frontend error branching without breaking existing API-client callers.
- Keep waiting-room failures isolated from the rest of the concert edit form.

**Non-Goals:**

- No audience-web changes, new route, tab, or separate waiting-room page.
- No new admin endpoint; both roles continue using `/organizer/waiting-room/:concertId`.
- No runtime-status, queue-length, admitted-count, or analytics endpoint.
- No changes to FIFO ordering, Redis state, auto-activation computation, SSE, admission tokens, worker behavior, checkout, or production tuning.
- No database schema or migration.

## Decisions

### Decision 1: Reuse central concert authorization before every management operation

`GetWaitingRoomConfigUseCase`, `ConfigureWaitingRoomUseCase`, and `SetWaitingRoomOverrideUseCase` will accept authenticated actor context and an explicit `allowAdminOverride` value. Each operation will call the existing `AuthorizeConcertManagementUseCase` before reading or mutating waiting-room configuration.

The controller will derive the actor from `AuthenticatedUser`:

- an actor with `ADMIN` uses `allowAdminOverride: true`;
- an organizer uses `allowAdminOverride: false` and must own the target concert.

Because the central authorization use case returns immediately for an allowed admin override, each waiting-room operation must also establish that the target concert exists before persistence. This prevents admin PUT for an unknown UUID from falling through to a Prisma foreign-key error. Organizer ownership lookup already detects a missing concert, but the operation still uses one consistent target-existence contract.

Error mapping follows the same convention already used by the other concert-ownership-guarded controllers (`concert-error.mapper.ts`, `poster-error.mapper.ts`, `seating-map-error.mapper.ts`): `ForbiddenConcertOwnershipError` maps to HTTP 403, and `ConcertNotFoundError` or `WaitingRoomConcertNotFoundError` maps to HTTP 404. Invalid configuration remains HTTP 400. A valid, authorized concert with no waiting-room config also returns the existing config-not-found 404; the web page can safely interpret that case because the role-specific concert edit query has already loaded the concert successfully.

Alternative considered: map both a missing target and failed ownership authorization to a uniform HTTP 404 to avoid disclosing another organizer's concert through a direct UUID probe. Rejected because every other concert-ownership-guarded endpoint in the app (poster upload, seating map, ticket types) already distinguishes 403 from 404; a uniform-404 waiting-room endpoint would be the only inconsistent case in the app without meaningfully improving protection against enumeration overall.

Alternative considered: rely on the frontend's role-scoped concert list. Rejected because hiding a concert in UI does not secure direct API calls.

Alternative considered: add new ownership logic to the waiting-room repository. Rejected because `AuthorizeConcertManagementUseCase` already defines the repository-wide policy and is available through the already-imported `AuthModule`.

### Decision 2: One shared feature slice, wrapped by each page's existing FormSection

Waiting-room frontend code will live under:

```text
apps/web/src/features/concerts-shared/waiting-room/
  waiting-room.api.ts
  waiting-room.hooks.ts
  waiting-room-form.ts
  WaitingRoomConfigSection.tsx
  WaitingRoomConfigSection.spec.tsx
```

Exact filenames may follow local conventions, but API calls, query keys, form normalization, validation, state transitions, and rendered controls must have one implementation. Each role page supplies only its existing local `FormSection` wrapper and the concert ID.

The shared section will not render a nested `<form>`. All action controls use `type="button"`; number inputs prevent Enter from submitting the parent concert form. Saving waiting-room configuration therefore remains independent from saving concert metadata.

Alternative considered: implement role-specific components. Rejected because both roles call the same endpoints with the same contracts and behavior, and duplication would make validation and override semantics drift.

### Decision 3: Extend the existing API client with a backward-compatible typed error

The shared web API client will export an `ApiError extends Error` containing at least `status` and a safe message. Existing `get`, `put`, `patch`, `post`, and delete/form-data callers retain their signatures and continue receiving an `Error` subtype. The 401 token-clear/redirect behavior remains unchanged.

Waiting-room API functions use the existing client and identify an unconfigured room only through `error instanceof ApiError && error.status === 404`. They do not inspect message text and do not create a parallel raw-fetch implementation. Successful GET, PUT, and PATCH payloads are parsed using `WaitingRoomConfigResponseSchema`; request bodies are checked with their existing request schemas.

Alternative considered: expose raw response bodies or backend validation details. Rejected because the UI needs status, not internal payloads, and existing safe-message behavior should remain the presentation boundary.

### Decision 4: Maintain separate draft and persisted snapshots

The component state is modeled as:

```text
GET 200 ──> persisted=response ──> draft=response ──> configured=true
GET 404 ──> persisted=null     ──> draft=safeDefaults ──> configured=false
PUT 200 ──> persisted=response ──> draft=response ──> configured=true
PATCH 200 ─> persisted=response ──> draft.manualOverride=response.manualOverride
                                      other draft fields remain unchanged
```

Dirty state is derived by comparing normalized configurable fields in the draft against the persisted snapshot. For an unconfigured room, the draft is considered unsaved until the first successful PUT. The read-only panel always renders the persisted snapshot, never unsaved draft values; a separate `Có thay đổi chưa lưu` indicator communicates divergence.

PUT failure retains the entire draft. PATCH failure retains draft and persisted state. Mutations disable their own conflicting actions while pending to prevent duplicate requests.

### Decision 5: Use safe local defaults and never write on mount

The no-config form uses values matching current backend/Prisma defaults:

```json
{
  "enabled": false,
  "autoActivate": false,
  "manualOverride": "NONE",
  "maxConcurrency": 500,
  "admissionTtlSeconds": 600,
  "activateThreshold": 500,
  "deactivateThreshold": 100,
  "cooldownSeconds": 60
}
```

No GET fallback, mount effect, or retry triggers PUT. All three quick override buttons are disabled until a config exists and its persisted `enabled` value is true. This intentionally avoids the current PATCH repository behavior that can upsert a new enabled config using database defaults before the operator has reviewed or saved the form.

### Decision 6: Normalize string inputs before Zod and enforce the domain relation locally

Numeric fields remain editable strings in UI state so an empty field is representable. Submission normalization explicitly rejects empty strings, non-finite numbers, decimals, and values outside each integer minimum. It then calls `ConfigureWaitingRoomRequestSchema.safeParse` and performs the domain cross-field rule `activateThreshold > deactivateThreshold`, assigning the relation error to `deactivateThreshold` with understandable Vietnamese copy.

`admissionTtlSeconds` and `cooldownSeconds` are displayed in seconds. This avoids lossy or ambiguous minute conversion while preserving the wire contract. `maxConcurrency < 10` produces a visible, non-blocking demo/production warning and does not invalidate the request.

### Decision 7: Keep draft override selection separate from immediate override actions

The segmented `Tự động / Bật ngay / Tắt ngay` control changes only `draft.manualOverride`; it is persisted with the full PUT when the operator selects `Lưu cấu hình`.

The three quick buttons send PATCH immediately. They are disabled when no config exists, when persisted `enabled` is false, or while an override mutation is pending. On success the returned persisted snapshot replaces the old persisted snapshot, while only the draft's `manualOverride` is synchronized. This preserves unsaved edits to concurrency, TTL, thresholds, cooldown, and toggles.

### Decision 8: Present persisted operating mode, not Redis runtime status

The panel title is `Cấu hình đã lưu và chế độ vận hành`. Badge mapping is deterministic from persisted data:

| Persisted state | Badge |
|---|---|
| no config or `enabled=false` | `Đang tắt` |
| enabled + `FORCE_ON` | `Đang bật thủ công` |
| enabled + `FORCE_OFF` | `Tắt khẩn cấp` |
| enabled + `NONE` + `autoActivate=true` | `Tự động theo tải` |
| enabled + `NONE` + `autoActivate=false` | `Chờ bật thủ công` |

`Tự động theo tải` describes the configured mode, not whether the Redis load state is currently active. The UI does not infer runtime state that the response does not contain.

### Decision 9: Scope query data by session and concert

Waiting-room query keys include a dedicated namespace, authenticated role, JWT subject, and concert ID. GET, PUT, and PATCH all use the same scoped key. Successful writes update that exact query entry (or invalidate it where simpler) without crossing admin/organizer sessions, organizer identities, or concert IDs.

### Decision 10: Isolate loading, error, and accessibility behavior inside the section

The section owns its loading skeleton, retryable non-404 error state, mutation messages, and success toasts. A config request failure does not replace or disable the surrounding concert editor.

Toggles expose accessible names and checked state; the segmented control uses radio or pressed-button semantics; field errors are referenced with `aria-describedby`; status uses text as well as color; and all controls are keyboard operable. Waiting-room buttons do not submit the page-level concert form.

## Request Flows

```text
Admin/Organizer Edit Page
        |
        | render shared section with concertId + session scope
        v
GET /organizer/waiting-room/:concertId
        |
        +-- 200 --> Zod parse --> persisted + draft
        |
        +-- 404 --> safe disabled local draft; no write
        |
        +-- other error --> isolated retry state

Full save:
draft --> normalize --> request Zod + cross-field validation
      --> PUT --> response Zod --> persisted=draft=response

Quick override:
button --> PATCH { manualOverride }
       --> response Zod --> replace persisted
                         --> update draft.manualOverride only
```

Backend management authorization precedes all three operations:

```text
JWT actor + concertId
        |
        v
AuthorizeConcertManagementUseCase
   | organizer: ownership required
   | admin: explicit override allowed
        v
target existence check
        v
config read / upsert / override
```

## Risks / Trade-offs

- [Risk] HTTP 404 still represents both a genuinely missing concert and an authorized concert with no waiting-room config. → Mitigation: the frontend section is mounted only after the role-specific concert detail query already loaded the concert successfully, so an authorized caller only ever encounters the config-not-found 404, never the target-not-found 404. Ownership failures are a separate 403 and are not conflated with either 404 case.
- [Risk] An admin actor bypasses ownership before target existence is checked. → Mitigation: waiting-room operations explicitly verify the concert target before persistence even after authorization succeeds.
- [Risk] A quick PATCH could overwrite unsaved form edits if the full response replaces draft. → Mitigation: replace persisted state but synchronize only `draft.manualOverride`.
- [Risk] Embedding the section inside a page-level form can submit concert metadata accidentally. → Mitigation: no nested form, explicit button types, and Enter-key regression coverage.
- [Risk] Operators interpret `Tự động theo tải` as currently active. → Mitigation: label the panel as configured mode and explicitly state that runtime load state is not included.
- [Risk] Extending shared API errors changes a cross-cutting utility. → Mitigation: use an `Error` subclass, preserve method signatures and 401 behavior, and run the existing API-client suite plus full web tests.
- [Trade-off] Quick actions are unavailable until an enabled config is persisted. This adds one initial save but prevents implicit enabled configs with unreviewed defaults.

## Migration Plan

1. Add backend authorization context and safe error mapping; no database migration is required.
2. Add the backward-compatible web `ApiError` and focused tests.
3. Add the shared waiting-room feature slice and integrate it into both edit pages.
4. Deploy API and web together or API first. Existing endpoints and payloads remain compatible with audience clients.
5. Roll back the web section independently if needed; existing backend queue and audience behavior continue unchanged. Authorization hardening is safe to retain on rollback.

## Open Questions

None. This change fixes the low-concurrency warning at `< 10`, uses seconds for both duration inputs, maps ownership failures to HTTP 403 and missing targets to HTTP 404 consistent with the rest of the app's concert-management endpoints, and intentionally does not expose runtime Redis state.
