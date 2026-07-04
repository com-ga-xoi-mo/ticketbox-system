## 1. Shared Management Contracts

- [x] 1.1 Add strict management asset, linked-artist, concert response, organizer create/update, and admin update schemas/types under `packages/api-types/src/concert-management/`, reusing canonical event type and public asset primitives where wire shapes match; do not expose an admin concert-create schema.
- [x] 1.2 Add strict concert-artist replacement schema validation for UUIDs, unique artist IDs, unique contiguous `displayOrder` values beginning at zero, and valid empty replacement.
- [x] 1.3 Add admin artist search parameters, management artist response, paginated list, create/update, status, and upload response schemas/types under `packages/api-types/src/artist/`.
- [x] 1.4 Export the new contracts from `packages/api-types/src/index.ts`, add valid/invalid contract fixtures, and run `npm run build:api-types` plus focused `packages/api-types/src/contracts.spec.ts` tests.

## 2. Protected Concert Read Projection

- [x] 2.1 Extend the concert management application read model with event type, moderation, SEO, legacy asset IDs, safe poster/banner assets, and ordered management artist summaries including status and avatar metadata.
- [x] 2.2 Update `prisma-concert-write.repository.ts` list/detail queries to select poster, banner, and all linked artists in one query without N+1 reads, ordered by `displayOrder` and without filtering inactive links.
- [x] 2.3 Add a pure HTTP mapper from the application read model to the canonical management concert response and use it from admin/organizer list/detail controllers.
- [x] 2.4 Add repository and controller contract tests proving both roles receive complete safe metadata, inactive links remain visible, legacy fields remain, and storage internals are absent.

## 3. Event Type, SEO, and Moderation Writes

- [x] 3.1 Extend organizer create/update and admin update application commands and persistence with optional canonical `eventType`, nullable SEO fields, and `CONCERT` default compatibility while preserving omitted update values.
- [x] 3.2 Create role-specific strict DTO/mapping paths: organizer create/update accepts content fields but rejects moderation fields; admin update accepts content plus `isFeatured` and non-negative integer `displayOrder`; remove the accidental admin concert-create endpoint and schema.
- [x] 3.3 Validate nullable `seoImageUrl` as absolute HTTPS and preserve the existing public poster fallback when it is null.
- [x] 3.4 Update cache invalidation and mutation results so public catalog, featured, organizer, and admin reads reflect successful marketplace changes.
- [x] 3.5 Enforce marketplace mutation eligibility as DRAFT/PUBLISHED only for both roles, rejecting CANCELLED/ENDED without changing persisted state.
- [x] 3.6 Add use-case/controller tests for every event type, omitted default, nullable SEO, invalid URL, admin update featured values, absence of admin concert creation, organizer moderation rejection, and all four lifecycle statuses.

## 4. Protected Artist Catalog API

- [x] 4.1 Add a protected artist management query model and repository operation supporting case-insensitive `q`, ACTIVE/INACTIVE status filter, bounded `limit`, non-negative `offset`, total count, and stable ordering.
- [x] 4.2 Add `GET /admin/artists` guarded by ADMIN and map results through the canonical paginated management artist contract with safe avatar/poster metadata.
- [x] 4.3 Replace `any` request bodies in admin artist create/update with strict DTOs matching shared contracts and stable validation/conflict/not-found mapping.
- [x] 4.4 Harden artist avatar/poster upload controllers with typed multipart file handling and the existing raster MIME/signature/size validation path.
- [x] 4.5 Invalidate public artist caches and the concert catalog namespace after successful artist display-name, status, avatar, or poster mutations; log and swallow cache deletion failures so the committed mutation still returns success, relying on TTL fallback.
- [x] 4.6 Add query, use-case, controller, role-guard, shared-response, and cache-invalidation tests for all-status listing, search, pagination, create/update validation, and safe asset fields.

## 5. Transactional Concert-Artist Replacement

- [x] 5.1 Replace the untyped concert-artist controller body with the shared-contract-compatible DTO for both existing role-specific PUT endpoints.
- [x] 5.2 Extend the artist persistence port with one transaction-oriented replacement operation that locks the target concert row, loads current links, validates all submitted artists, replaces links, and synchronizes primary `artistName` atomically.
- [x] 5.3 Enforce unique contiguous ordering, active-only new links, retention-only behavior for already-linked inactive artists, and empty-list legacy-name preservation.
- [x] 5.4 Preserve organizer ownership and admin override through `AuthorizeConcertManagementUseCase`; return stable validation/not-found/forbidden outcomes without partial writes.
- [x] 5.5 Invalidate the public concert catalog namespace only after a replacement transaction commits successfully; log and swallow cache failure so the committed replacement still returns success.
- [x] 5.6 Add unit/repository tests for primary synchronization, empty clear, multiple ordering, duplicates, gaps, unknown artist, new inactive rejection, retained inactive link, rollback, ownership, cache invalidation, and concurrent serialization with last-successful-commit wins.

## 6. Banner Upload and Replacement Lifecycle

- [x] 6.1 Add banner upload domain input/result types and a persistence port that associates the existing `Concert.bannerAssetId` using safe POSTER-kind asset metadata without changing Prisma schema.
- [x] 6.2 Implement banner upload use case by reusing poster raster validation limits, unique concert-scoped storage keys, `ObjectStoragePort.getPublicUrl`, authorization, and mutation cache invalidation.
- [x] 6.3 Implement persistence/cleanup ordering: upload first, atomically persist and associate, compensate the new object on DB failure, then hard-delete replaced object/metadata only after success.
- [x] 6.4 Expose `POST /organizer/concerts/:id/banner` and `POST /admin/concerts/:id/banner` with typed multipart handling and role/ownership enforcement; allow DRAFT/PUBLISHED and reject CANCELLED/ENDED.
- [x] 6.5 Add use-case, repository, controller, and storage-fake tests for valid formats, invalid signature/type/size, ownership, admin override, replacement cleanup, compensation, and public URL response.

## 7. Web API and Query Integration

- [x] 7.1 Replace frontend-local protected concert wire assumptions with canonical management schemas/types in admin and organizer API modules while keeping separate role-scoped query keys.
- [x] 7.2 Reuse `GET /public/artists?q=&limit=&offset=` for active artist selector search, and add web API functions/hooks for protected admin artist catalog CRUD, concert-artist replacement, banner upload, SEO/event updates, and admin moderation without adding an organizer search endpoint.
- [x] 7.3 Validate successful management responses with shared schemas and map HTTP validation/conflict/forbidden failures to safe UI errors without rendering raw payloads.
- [x] 7.4 Add API/hook tests proving correct role-prefixed endpoints, exact request bodies, response parsing, multipart handling, and targeted cache invalidation.

## 8. Admin Artist Catalog UI

- [x] 8.1 Add `/admin/artists` routing and admin navigation using the existing protected shell and ADMIN route guards.
- [x] 8.2 Build paginated artist table/list UI with debounced search, ACTIVE/INACTIVE filter, loading/empty/error states, avatar/poster public URL resolution, and accessible controls.
- [x] 8.3 Build strict create/edit artist forms for slug, display name, optional bio, and status with field-level validation and conflict guidance.
- [x] 8.4 Add duplicate-submit-safe avatar and poster upload/replace controls with preview, progress, success refresh, and safe failure state.
- [x] 8.5 Add component/page tests for search, pagination, filters, create/edit, image uploads, validation, keyboard access, and organizer route denial.

## 9. Concert Marketplace Form Fields

- [x] 9.1 Extend shared concert form state, validation, create/update payload mapping, and edit hydration with event type and nullable SEO fields; keep manual `artistName` required/editable only when no linked artists exist.
- [x] 9.2 Build a debounced async artist multi-select that shows avatar/name, prevents duplicate selection, labels the primary artist, and never offers inline artist creation.
- [x] 9.3 Add keyboard-operable move-up/move-down ordering, optional drag-and-drop enhancement, and visible inactive warnings with retain/remove behavior.
- [x] 9.4 Integrate two-step DRAFT creation: derive base `artistName` from the selected primary artist when present, submit base concert first, replace artists second, retain selections and show retry on link failure, and never publish automatically.
- [x] 9.5 On edit with linked artists, render `artistName` as derived/read-only and omit manual name updates; after clearing all links, preserve the last name and restore manual editing on the next unlinked edit.
- [x] 9.6 Add banner upload/preview and SEO controls to organizer create/edit and admin edit flows using `publicUrl` first and `/assets/:id` fallback.
- [x] 9.7 Add admin-only featured toggle/display order controls and assert organizer pages neither render nor submit moderation fields.

## 10. Concert List and Detail Presentation

- [x] 10.1 Extend management concert table/detail components to display event type and ordered linked artist summaries, including primary and inactive indicators where space permits.
- [x] 10.2 Apply shared poster/banner resolution consistently across list, detail, and edit surfaces with `publicUrl` primary and asset endpoint fallback.
- [x] 10.3 Ensure successful event, SEO, artist, banner, and moderation mutations refresh selected detail and role-scoped list state without cross-role cache pollution.
- [x] 10.4 Add rendering and state tests for populated/empty artists, inactive links, external seeded image URLs, fallback assets, and admin/organizer differences.

## 11. Backend and Contract Regression Tests

- [x] 11.1 Run focused shared contract, concert-management, artist-discovery, storage, and HTTP adapter Vitest suites; fix only failures caused by this change and record unrelated baseline failures.
- [x] 11.2 Add contract parity tests proving Nest DTO constraints and HTTP mappers match shared Zod schemas for organizer/admin concert and artist endpoints.
- [x] 11.3 Add public catalog regression tests proving inactive artists remain excluded, `artistName` remains present, featured ordering still works, and SEO image fallback is unchanged.
- [x] 11.4 Run `npm run build:api-types` and `npx tsc -p apps/api/tsconfig.app.json --noEmit` after backend integration.

## 12. Web and End-to-End Verification

- [x] 12.1 Run `npm --workspace @ticketbox/web run typecheck`, focused Vitest tests, full web tests, and `npm --workspace @ticketbox/web run build`.
- [x] 12.2 Add database-backed E2E coverage for organizer ownership, admin override, strict moderation rejection, protected projections, artist replacement atomicity, inactive retention, artist catalog roles, and banner replacement/compensation.
- [x] 12.3 Verify legacy create/update requests without marketplace fields still succeed and existing publish/cancel, poster, seating-map, and audience catalog E2E flows remain unchanged.
- [x] 12.4 Run `npm run test:e2e` when the test database and object-storage fake are available; record environment-only skips without using real S3.

## 13. Documentation and Final Review

- [x] 13.1 Document role permissions, event type values, primary artist synchronization, inactive link behavior, banner upload endpoints, featured moderation, and two-step draft creation retry behavior.
- [x] 13.2 Inspect the final diff for unintended Prisma schema/migration changes, leaked storage internals, `any` request bodies in touched controllers, duplicate wire types, and unrelated worktree edits.
- [x] 13.3 Run `npm run verify:prisma`, applicable workspace checks, `git diff --check`, and `openspec validate --changes "expand-concert-marketplace-management"`.
