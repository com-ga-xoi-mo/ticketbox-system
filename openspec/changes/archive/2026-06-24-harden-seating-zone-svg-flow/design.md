## Context

The `concert-management` module follows hexagonal architecture: domain ports define interfaces with Symbol-based DI tokens, Prisma implementations live in `infrastructure/database/`, and NestJS controllers are HTTP adapters. Error mapping wraps domain errors into HTTP exceptions via `mapSeatingMapErrors()`.

**Current seating flow:**
1. `UploadSeatingMapUseCase` validates SVG safety (regex denylist), uploads to Object Storage, creates `Asset` row, and swaps `Concert.seatingMapAssetId` in a transaction. On re-upload, the old `Asset` row is deleted but `SeatingZone` rows are untouched.
2. `UpsertSeatingZonesUseCase` receives an array of zones, checks for duplicate `svgElementId` within the request, then calls `PrismaSeatingZoneRepository.upsertMany` which runs `prisma.seatingZone.upsert()` in a transaction keyed on the compound unique `(concertId, svgElementId)`. Zones not in the payload are preserved (no delete step).
3. Both organizer and admin controllers expose these as `PUT seating-zones` with identical use cases, differing only in `allowAdminOverride`.

**Schema facts:**
- `Asset.metadata` is `Json?` — already exists, no migration needed.
- `SeatingZone` has `@@unique([concertId, svgElementId])` and `@@unique([id, concertId])`.
- `TicketTypeZone` has `onDelete: Cascade` on both FK to `TicketType` and `SeatingZone`.
- `Concert.status` is enum `DRAFT | PUBLISHED | CANCELLED | ENDED`.

## Goals / Non-Goals

**Goals:**
- Ensure every `svgElementId` stored in `SeatingZone` actually exists in the uploaded SVG.
- Prevent zone configuration when no SVG has been uploaded.
- Clean up orphaned zones when SVG is replaced.
- Harden SVG safety with an allowlist sanitizer that preserves element IDs.
- Restrict seating setup to `DRAFT` concerts only.
- Fix endpoint semantics to match actual merge behavior (`PATCH` not `PUT`).

**Non-Goals:**
- Frontend/UI changes (separate change).
- Changing the `TicketType` or `TicketTypeZone` endpoints or logic.
- Adding a DELETE endpoint for individual zones (out of scope).
- Adding zone diff/reconcile logic on SVG re-upload (we chose full reset for simplicity).
- Schema migration — all changes use existing `Asset.metadata` Json field.

## Decisions

### D1: Store extracted SVG element IDs in `Asset.metadata.svgElementIds`

**Decision:** When uploading an SVG, parse the sanitized SVG content, extract the `id` attribute of **every** element that has one (not filtered by tag type — an organizer may anchor a zone to any element), dedupe, and store them as `Asset.metadata = { svgElementIds: string[] }`. This matches task 2.3 and the spec scenario that includes IDs on `<defs>`/`<linearGradient>`/`<clipPath>`.

**Rationale:** The `Asset.metadata` column (`Json?`) already exists in the schema. Storing IDs there keeps them co-located with the asset they describe and avoids any schema migration. The alternative — a separate `SeatingMapElement` table — would require a migration and add complexity for a simple string-array lookup.

**Implementation:** Create a new `SvgElementIdExtractor` service in `application/services/` that takes a sanitized SVG string and returns `string[]`. Called inside `UploadSeatingMapUseCase` after sanitization, before storage. The extracted IDs are passed to the repository along with the other asset data.

### D2: Validate `svgElementId` against the stored set during zone PATCH

**Decision:** In the zone upsert use case, load the concert's `seatingMapAssetId`, fetch the asset's `metadata.svgElementIds`, and reject any zone whose `svgElementId` is not in that set.

**Rationale:** This is the core fix for problem #1 (zones pointing to nonexistent SVG elements). By loading the asset metadata we avoid re-downloading and re-parsing the SVG file from storage on every zone update.

**New domain errors:**
- `SeatingMapRequiredError` — concert has no `seatingMapAssetId`.
- `InvalidSvgElementIdError(invalidIds: string[])` — one or more `svgElementId` values not found in the SVG.

Both mapped to `BadRequestException` (400) in `seating-map-error.mapper.ts`.

**Repository change:** `SeatingZoneRepositoryPort` needs a new dependency or the use case needs access to the asset repository. Decision: inject `SeatingMapWriteRepositoryPort` (already has `findAssetById`) into the upsert use case to load asset metadata.

**Read-path gap (must fix):** The current `SeatingMapAsset` domain type (`domain/seating-map.types.ts`) does NOT include a `metadata`/`svgElementIds` field, and `PrismaSeatingMapWriteRepository.toDomain` does not map it. So `findAssetById` cannot surface the stored IDs as written. This change MUST extend `SeatingMapAsset` with `svgElementIds: string[]` (derived from `metadata.svgElementIds`, defaulting to `[]`) and update the `toDomain` mapping; otherwise D2 validation has nothing to read.

### D3: Delete all zones on SVG re-upload (full reset)

**Decision:** Inside `PrismaSeatingMapWriteRepository.createAssetAndAssociateConcertSeatingMap`, after swapping the asset, add `prisma.seatingZone.deleteMany({ where: { concertId } })` within the same transaction.

**Rationale:** When the SVG changes, element IDs are likely different. Attempting a diff/reconcile (match old IDs to new IDs) is complex, error-prone, and unnecessary since no tickets have been sold at this stage (concerts must be in DRAFT to upload). Full reset is simple, predictable, and safe because `TicketTypeZone` rows cascade-delete automatically. `TicketType` rows are preserved since they have no direct FK to `SeatingZone`.

**Alternative considered:** Mark orphaned zones as `INACTIVE` instead of deleting. Rejected because it leaves stale data in the system and requires the organizer to manually clean up.

### D4: Allowlist SVG sanitizer replaces denylist regex

**Decision:** Replace `SvgSafetyValidator` with `SvgSanitizer` that uses an allowlist approach. Only permitted SVG tags (e.g., `svg`, `g`, `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `text`, `tspan`, `defs`, `use`, `clipPath`, `mask`, `linearGradient`, `radialGradient`, `stop`, `title`, `desc`) and safe attributes (e.g., `id`, `class`, `d`, `fill`, `stroke`, `viewBox`, `width`, `height`, `transform`, `x`, `y`, `cx`, `cy`, `r`, `rx`, `ry`, `x1`, `y1`, `x2`, `y2`, `points`, `style` — with style content also sanitized to remove `url()` and `expression()`) are preserved. Everything else is stripped.

**Critical requirement:** `id` attributes MUST be preserved — they are the bridge between SVG shapes and `SeatingZone.svgElementId`.

**`href`/`xlink:href` handling (resolves the `use` ambiguity):** `href` and `xlink:href` are allowed ONLY when the value is a local fragment reference starting with `#` (e.g., `<use href="#zone-a">`). Any `href`/`xlink:href` whose value is an absolute/relative URL (`http:`, `//`, `data:`, etc.) is stripped. This keeps `<use>`, `clipPath`, `mask` usable for legitimate internal references while blocking all external/remote references. `url(...)` inside `style`/presentation attributes is likewise restricted to `url(#...)` local refs.

**Implementation:** Use a DOM parser (e.g., `linkedom` or `jsdom`) server-side to parse the SVG into a DOM tree, walk the tree, remove disallowed elements and attributes, then serialize back to a string. Store the sanitized version.

**Interface change:** The old `SvgSafetyValidator.validate()` returned `{ safe: boolean, reasons: string[] }`. The new `SvgSanitizer.sanitize()` returns `{ sanitizedBuffer: Buffer, removedElements: string[] }`. It always succeeds (stripping unsafe content) rather than rejecting. The use case stores the sanitized buffer instead of the original.

### D5: Draft-only guard for seating setup endpoints

**Decision:** Add a concert-status check at the beginning of both `UploadSeatingMapUseCase` and `UpsertSeatingZonesUseCase` (after authorization). If `concert.status !== 'DRAFT'`, throw `ConcertNotDraftError`.

**Rationale:** Seating map and zone configuration is a setup activity that must be finalized before publishing. Allowing changes after publish would invalidate sold tickets' zone references.

**Applies to admins too (decided):** The draft-only guard is enforced for ALL callers — `allowAdminOverride` does NOT bypass it. The admin endpoints (`admin-concert.controller.ts`: `@Post('concerts/:id/seating-map')` and the seating-zones route) share the same use cases, so admins are equally restricted to DRAFT concerts. `allowAdminOverride` still only governs ownership authorization, never the lifecycle guard. No separate admin code path is added.

**Implementation:** The use case already calls `authorizeConcertManagement` which loads the concert. Add a status check after authorization. Add `ConcertNotDraftError` to domain errors, mapped to `BadRequestException` with a clear message.

**Repository consideration:** Neither use case can read concert status from `authorizeConcertManagement` — its `execute()` returns `Promise<void>` (it only throws on failure). So the status must be loaded explicitly.
- `UpsertSeatingZonesUseCase` currently only depends on `SeatingZoneRepositoryPort`. It now also needs to load the concert (for status check and to read `seatingMapAssetId`). Inject `ConcertWriteRepositoryPort` (method is `findConcertById`, returns `Concert` with `status` + `seatingMapAssetId`). **Chosen** — same pattern as `UpdateTicketTypeZoneMappingsUseCase`.
- `UploadSeatingMapUseCase` ALSO needs the draft check and currently injects NO concert repo. It must likewise inject `ConcertWriteRepositoryPort` and call `findConcertById` after authorization. The module wiring for this provider must be updated too (not only the zone-upsert provider).

### D6: Change PUT to PATCH on seating-zones endpoint

**Decision:** Change HTTP method from `PUT` to `PATCH` on both `organizer/concerts/:id/seating-zones` and `admin/concerts/:id/seating-zones`.

**Rationale:** The existing behavior is merge/upsert (zones not in the payload are preserved). This is `PATCH` semantics. Using `PUT` would imply "replace all" which is not what the code does.

**Breaking change:** Any existing API consumers using `PUT` will get 404/405. This is acceptable since the system is in pre-launch development.

### D7: Merge is collection-level; each submitted zone carries its full fields (interpretation A)

**Decision:** The PATCH merge operates at the **collection** level: zones present in the payload are upserted, zones absent are preserved. Within each submitted zone, the client sends the zone's **complete** fields (`svgElementId`, `label`, `displayOrder`, plus optional `color`/`status`). The DTO stays unchanged (`label` and `displayOrder` remain required per zone).

**Rationale:** The FE loads each zone's current values before editing, so re-sending the full object costs nothing and keeps the DTO and `upsertMany` logic untouched. We explicitly did NOT choose per-field partial updates (which would require making `label`/`displayOrder` optional, changing `upsertMany` to skip `undefined` fields, fixing the existing `color ?? null` clobber, and moving the "label required on create" rule into the use case). This avoids that complexity.

**Implication:** Because every submitted zone always includes `color`, the current `color: zone.color ?? null` behavior in `upsertMany` is acceptable as-is (no partial-update clobber risk).

### D8: Recompute checksum and size from the sanitized buffer

**Decision:** Since the sanitized SVG (not the original upload) is what gets stored, `checksum` and `sizeBytes` on the `Asset` MUST be computed from the sanitized buffer, not from `input.fileBuffer`/`input.sizeBytes`. The original-file size limit check still runs against the uploaded bytes before sanitization.

**Rationale:** Storing sanitized content while recording the original's checksum/size would make the stored object inconsistent with its metadata.

### Cache note

Public catalog/availability responses embed seating zones, so zone/asset mutations could in principle serve stale cache. This is a **non-issue** here: the D5 draft-only guard means all of these operations run exclusively on `DRAFT` concerts, which are not part of the published public catalog/cache. No cache invalidation work is required in this change.

## Risks / Trade-offs

- **[Risk] SVG parsing overhead** → Parsing SVG server-side adds latency to upload. Mitigation: SVGs for venue maps are typically small (< 1MB). Parse once at upload, cache IDs in metadata. Zone PATCH only reads metadata, never re-parses.

- **[Risk] Full zone reset on re-upload may surprise organizers** → Mitigation: Frontend (in a future change) should show a confirmation dialog before re-upload explaining that zones and ticket-type mappings will be reset. Backend returns the reset information in the response.

- **[Risk] DOM parser dependency** → Adding `linkedom` or `jsdom` is a new dependency. Mitigation: `linkedom` is lightweight (~50KB), well-maintained, and specifically designed for server-side DOM parsing without a full browser engine. Preferable to `jsdom` which is heavier.

- **[Trade-off] Sanitize-and-store vs reject-and-explain** → We chose to sanitize (strip bad content, store clean version) rather than reject with detailed errors. This is friendlier for organizers who may not understand SVG internals, but means the stored SVG may differ from what was uploaded. The `removedElements` list in the response helps transparency.

- **[Trade-off] Draft-only restriction** → Prevents fixing zone labels on a published concert. Accepted because zone changes after publish could break the public catalog. If needed later, a controlled "amend" workflow could be added.
