## Context

The database already contains `Concert.eventType`, featured ordering, SEO fields, `bannerAssetId`, `Artist`, and `ConcertArtist`. Public catalog reads join these relations and expose marketplace-rich responses, while protected concert reads still use the older write model and the web management form only edits basic fields plus legacy `artistName`. Artist administration and concert-artist replacement endpoints exist, but use untyped request bodies and have no management UI.

The change spans `packages/api-types`, concert-management, artist-discovery, shared object storage, and `apps/web`. It must preserve existing clients, audience filtering, ownership rules, and a dirty worktree containing unrelated changes.

## Goals / Non-Goals

**Goals:**

- Give protected concert reads a canonical management projection containing marketplace fields, safe assets, and ordered linked artists.
- Let organizers manage event type, SEO, banner, and artists for owned concerts while reserving featured placement for admins.
- Make artist replacement deterministic and atomic with legacy primary-name synchronization.
- Provide an admin artist catalog and accessible artist selection/ordering UI.
- Reuse existing schema and object-storage lifecycle without a database migration.

**Non-Goals:**

- Artist merge, fuzzy duplicate detection, organizer artist proposals, or automatic artist creation.
- Name-based backfill of existing `ConcertArtist` rows.
- Publish/cancel redesign, changes to concert creation authority, or public audience redesign.
- Removal of `artistName`, asset ID fields, or `GET /assets/:id` fallback.

## Decisions

### 1. Canonical management contracts live in `@ticketbox/api-types`

Add strict Zod schemas for management assets, linked artists, concerts, create/update requests, admin moderation, artist search/list/create/update, and concert-artist replacement. Backend HTTP adapters and `apps/web` consume these contracts; backend domain/application layers remain independent.

The management concert response retains legacy fields and adds `eventType`, `posterAsset`, `bannerAsset`, `artists`, `seoTitle`, `seoDescription`, `seoImageUrl`, `isFeatured`, and `displayOrder`. Asset projections omit storage keys, checksums, uploader IDs, and binary content.

Alternative: extend frontend-local interfaces only. Rejected because it would preserve the current contract drift.

### 2. Role-specific DTOs enforce content versus moderation authority

Organizer create/update accepts marketplace content (`eventType`, SEO) but never `isFeatured` or `displayOrder`; strict validation rejects those fields rather than silently ignoring them. Admin update accepts content plus moderation fields. There is no admin concert-create contract or endpoint. Omitted organizer-create `eventType` maps to `CONCERT`; omitted update fields preserve stored values.

`seoImageUrl` is nullable and, when non-null, must be an absolute HTTPS URL. Audience SEO fallback remains `seoImageUrl`, then poster public URL, then omitted.

Alternative: share one permissive DTO and discard organizer moderation fields. Rejected because silent privilege-field dropping hides client bugs.

### 3. Protected reads use a dedicated management projection

Concert list/detail persistence joins poster, banner, and all linked artists ordered by `displayOrder`, including inactive linked artists. Linked artist items include id, slug, display name, status, display order, and safe avatar metadata. Public reads keep filtering inactive artists.

The projection is returned by both admin and organizer list/detail endpoints. Existing counts and legacy IDs remain unchanged.

Alternative: make management pages call public detail APIs. Rejected because public endpoints exclude draft/cancelled concerts and inactive linked artists.

### 4. Artist replacement is normalized and transactional

The replace request requires unique artist IDs and a unique contiguous ordering `0..n-1`; a non-empty list therefore has exactly one primary artist at order 0. The persistence operation validates eligibility, replaces all `ConcertArtist` rows, and updates `Concert.artistName` to the primary artist's current display name in one database transaction. An empty list deletes links and leaves the existing legacy `artistName` unchanged.

New links must target active artists. An inactive artist already linked to the same concert may be retained during a replacement so a user can reorder other artists without involuntarily deleting historical linkage; it is shown with a warning and cannot be newly selected. Public responses continue excluding it.

Replacement transactions lock the target concert row before reading existing links or writing replacements. Concurrent requests therefore serialize; each request remains all-or-nothing and the last successfully committed complete replacement becomes the final state. Successful replacement invalidates the public concert catalog cache after commit.

Alternative: keep `artistName` independent. Rejected because the primary selection and legacy audience fallback would diverge. Automatic historical name matching is also rejected because names are not stable identities.

### 5. Concert creation remains backward-compatible and linking remains a separate command

The organizer create endpoint accepts optional `eventType` and SEO fields but does not require artist links. Admins update marketplace content and moderation only on existing concerts; no admin create endpoint, contract, or UI is introduced. The web organizer create flow creates the DRAFT concert, then calls the existing replace-artists endpoint when selections were made. If linking fails, the draft remains and the UI stays on its edit route with a retryable error; it never publishes automatically. This avoids a cross-bounded-context create transaction and preserves old clients.

For unlinked concerts, manual `artistName` remains required and editable for backward compatibility. When the form has one or more selected artists, the client sends the selected primary artist's current display name as the base `artistName`, saves base metadata first, and then calls replace-artists. On edit, a concert with linked artists renders the legacy name as derived/read-only and omits manual `artistName` changes; replace-artists is the sole owner of synchronization. Clearing all links preserves the last synchronized legacy name and re-enables manual editing on the next unlinked edit.

### 6. Admin artist catalog has a protected read model

Add `GET /admin/artists?q=&status=&limit=&offset=` returning ACTIVE and INACTIVE artists with safe avatar/poster metadata and pagination. Existing admin create/update/upload endpoints receive strict DTOs and stable error mappings. Organizer and admin concert selectors reuse the existing active-only `GET /public/artists?q=&limit=&offset=` contract; no new organizer search route is introduced. Already-linked inactive artists come only from the management concert projection and may be retained or removed, but unrelated inactive artists are never selectable.

Successful artist replacement invalidates the concert catalog namespace. Admin artist display-name, status, avatar, or poster mutations also invalidate affected public artist caches and the concert catalog namespace because linked public concert responses embed artist metadata and filter by artist status. Cache invalidation happens after successful persistence as a best-effort side effect: failure is logged, does not change the successful HTTP outcome, and never rolls back committed business data; the existing TTL remains the fallback.

### 7. Banner upload mirrors poster lifecycle

Add role-specific `/banner` multipart endpoints. Banner validation accepts PNG, JPEG, and WebP under the existing image size limit. The use case authorizes ownership/admin override, uploads a uniquely keyed object, derives/persists `publicUrl`, associates `bannerAssetId`, and cleans up the replaced object/asset with the same compensation and hard-delete ordering as poster replacement.

The existing `AssetKind.POSTER` is reused for banner image assets because the schema has no banner kind and the change forbids schema additions. Relationship context distinguishes poster from banner. Clients render `bannerAsset.publicUrl` first and use `/assets/:id` only when public URL is absent.

Alternative: add `AssetKind.BANNER`. Rejected for this change because it would require a database enum migration and contradict the no-schema-change scope.

Marketplace metadata updates, artist replacement, and banner upload/replacement are allowed only while the concert is `DRAFT` or `PUBLISHED`. `CANCELLED` and `ENDED` concerts remain readable through management projections but reject these mutations for both organizer and admin callers. Seating-map behavior remains unchanged and continues to be DRAFT-only.

### 8. Web UI separates authoring and moderation controls

Shared concert form components add event type, async multi-select, accessible move-up/move-down ordering, banner preview/upload, and SEO inputs. Organizer cannot create artists from the selector. Admin edit additionally renders featured toggle and non-negative display order. Concert table/detail show event type and ordered artist summaries.

Add `/admin/artists` to the existing admin shell/navigation with paginated search, status filter, create/edit dialogs or pages, and avatar/poster uploads. Keyboard controls and visible primary/inactive labels are required; drag-and-drop may be added only if keyboard ordering remains available.

## Risks / Trade-offs

- [Risk] Two-step concert creation can leave a DRAFT without selected artists if linking fails. → Keep the user on the edit screen, preserve selections, show a retry action, and never publish implicitly.
- [Risk] Primary artist renames do not automatically update historical `Concert.artistName`. → Synchronize on each successful artist replacement; global rename propagation remains out of scope.
- [Risk] Existing inactive links complicate active-only selection. → Return them in management reads, permit retention only when already linked, and mark them clearly.
- [Risk] Banner replacement can orphan an object on partial failure. → Reuse poster compensation: delete the new object on persistence failure and delete the old object only after association succeeds.
- [Risk] Larger protected responses increase query cost. → Join only safe selected metadata and avoid N+1 queries; paginate artist catalog results.
- [Risk] Shared contract defaults can mutate parsed payloads. → Contract tests compare intentional defaults and HTTP mappers emit complete canonical response shapes.

## Migration Plan

1. Build shared contracts and backend projections/write behavior first; no Prisma migration is required.
2. Deploy backend endpoints while existing web clients continue using legacy fields.
3. Deploy management UI after contract compatibility and role authorization tests pass.
4. Existing concerts retain their values and are not name-matched or backfilled.
5. Rollback the web independently; additive backend response fields and optional request fields remain compatible.

## Open Questions

None. Organizer-only concert creation, admin update behavior, legacy `artistName` precedence, editable statuses, selector routing, cache invalidation, and concurrent replacement semantics are fixed by the decisions above. Existing image validation limits and poster cleanup behavior remain the source of truth for banner uploads.
