## Context

The ticketbox platform models artist data as a single `artistName` string on the `Concert` model. The existing `ArtistBio` module generates AI-powered bios per concert (not per artist) using press kit uploads. The platform has a mature asset infrastructure (`Asset` model + `ObjectStoragePort` with S3/MinIO) and follows a clean architecture pattern: domain → application → adapters/http per NestJS module. The `@ticketbox/api-types` package provides framework-independent Zod schemas shared between backend and frontend/mobile consumers.

The audience web app needs artist profile pages, a top-artists homepage rail, and follow/favorite engagement features. These all require an `Artist` entity that does not yet exist. Concerts in practice feature multiple artists, but the schema only holds one `artistName` string.

**Stakeholders**: Audience users (discovery, engagement), organizers (linking artists to concerts), admin (artist data management), frontend team (consuming new APIs in the follow-up `implement-audience-artist-pages` change).

**Constraints**:
- `Concert.artistName` must remain populated and returned for backward compatibility.
- The existing `ArtistBio` AI module is per-concert and must not be replaced. The new `Artist.bio` field is a separate editorial/static bio for the artist profile.
- Customer users map to the existing `AUDIENCE` role. No new role is introduced.
- This change is backend/API/contract only. No audience UI implementation.

## Goals / Non-Goals

**Goals:**
- Introduce `Artist` as a first-class domain entity with profile data and asset references.
- Support many-to-many artist–concert relationships.
- Provide public APIs for artist listing, profile, timeline, and top artists.
- Provide AUDIENCE-authenticated APIs for follow/favorite with idempotent semantics.
- Update public concert responses to include linked artist data.
- Update `@ticketbox/api-types` with new artist contracts.
- Seed demo artists for development.

**Non-Goals:**
- Full artist CMS with CRUD UI for organizers/admins.
- Audience web UI pages (deferred to `implement-audience-artist-pages`).
- Replacing the `ArtistBio` AI per-concert bio system.
- Removing or deprecating `Concert.artistName`.
- Recommendation algorithms beyond simple favorite-count ranking.
- Social features (comments, messaging, fan posts).
- Artist-owned accounts or artist self-service.

## Decisions

### Decision 1: Follow and Favorite are separate concepts

**Choice**: Two distinct relations — `ArtistFollow` and `ArtistFavorite`.

**Rationale**:
- **Follow** = the user wants updates/notifications about the artist. Future notification integration can target followers.
- **Favorite** = the user marks the artist as liked/saved. The "top artists" homepage rail ranks by total favorite count.
- Separating them gives the platform flexibility: a user might favorite an artist without wanting notifications, or follow for updates without ranking them as a personal favorite.

**Alternatives considered**:
- *Single "like" concept*: Simpler, but conflates notification intent with ranking signal. Would require splitting later.
- *Three-state toggle*: Too complex for the initial feature; YAGNI.

### Decision 2: Artist bio vs ArtistBio AI module

**Choice**: The `Artist` entity has an optional `bio` text field for editorial/static content. The existing `ArtistBio` model remains per-concert for AI-generated bios from press kits.

**Rationale**:
- `ArtistBio` is tied to a specific concert and its press kit upload workflow. It has statuses like PROCESSING, READY_FOR_REVIEW, PUBLISHED — a full async pipeline.
- `Artist.bio` is a simple text field for the artist profile page, editable by admin. It describes the artist generally, not in the context of a specific concert.
- Public artist profile returns `Artist.bio`. Public concert detail continues to return the per-concert `publishedArtistBio` from the `ArtistBio` module.

**Alternatives considered**:
- *Reuse ArtistBio for artist profile*: The ArtistBio model is concert-scoped and has AI pipeline semantics. Repurposing it would require significant refactoring and conceptual confusion.

### Decision 3: Backward compatibility with artistName

**Choice**: `Concert.artistName` remains a required string field. When artists are linked via `ConcertArtist`, the `artistName` field serves as a legacy display name / fallback. It is NOT auto-derived from linked artists.

**Rationale**:
- All existing queries, seed data, tests, and frontend code rely on `artistName`.
- Auto-syncing `artistName` from linked artists introduces complexity (which artist name? what order? what if artists change names?).
- The field remains the "headline artist label" for simple display, while `artists[]` provides structured data for rich UIs.

**Migration path**:
- Existing concerts keep their `artistName` values untouched.
- When creating new concerts, organizers still provide `artistName`. Optionally, they can also link `Artist` records.
- The seed script creates `Artist` records matching existing `artistName` values and links them to the corresponding concerts.

**Alternatives considered**:
- *Auto-populate artistName from linked artists*: Creates sync complexity and ambiguity. Rejected.
- *Remove artistName*: **BREAKING**. Rejected for backward compatibility.

### Decision 4: Artist avatar and poster assets

**Choice**: Reuse the existing `Asset` model and `ObjectStoragePort` with two new `AssetKind` values: `ARTIST_AVATAR` and `ARTIST_POSTER`.

**Rationale**:
- The platform already has a proven asset pipeline with validation, storage, public URL generation, and serving.
- Adding new `AssetKind` values is a minimal schema change.
- Storage keys follow the convention: `artists/{artistId}/avatar/{assetId}.{ext}` and `artists/{artistId}/poster/{assetId}.{ext}`.
- The `Artist` model references `avatarAssetId` and `posterAssetId` as optional foreign keys to `Asset`, same pattern as `Concert.posterAssetId`.

**Alternatives considered**:
- *Store URLs directly on Artist*: Loses metadata tracking, checksum validation, lifecycle management. Rejected.
- *New storage infrastructure*: Unnecessary duplication. Rejected.

### Decision 5: Public artist profile response shape

**Choice**: The artist profile endpoint (`GET /public/artists/:slug`) returns a composite response with:
- Artist identity: id, slug, displayName, bio, avatarAsset, posterAsset, status
- Engagement counts: `followerCount`, `favoriteCount` (aggregate integers, no user identities exposed)
- Event timeline: embedded array of upcoming published concerts where the artist appears, plus a `pastEventCount` integer

**Rationale**:
- Embedding upcoming events avoids a second round-trip for the common profile page render.
- Past events are counted but not listed inline to keep the response size bounded. A separate paginated endpoint can be added later if needed.
- Counts are integers computed server-side. No user IDs or private data leak.

**Alternatives considered**:
- *Separate timeline endpoint*: Adds latency for the initial page load. Can be added later for pagination.
- *Include full past events inline*: Unbounded response size. Rejected for initial version.

### Decision 6: Top favorite artists ranking

**Choice**: The `GET /public/artists/top` endpoint returns artists ranked by descending `favoriteCount`. The count is maintained as a denormalized integer on the `Artist` model, incremented/decremented on favorite/unfavorite actions.

**Rationale**:
- A denormalized counter avoids expensive `COUNT(*)` queries on every homepage load.
- The counter is updated atomically using Prisma's `increment`/`decrement` operations.
- No private user data is exposed — only the aggregate count.

**Alternatives considered**:
- *Real-time COUNT query*: Expensive at scale, especially for the homepage rail. Rejected for initial version.
- *Materialized view / cache*: Premature optimization. The denormalized counter is sufficient and simpler.

### Decision 7: Artist timeline scope

**Choice**: The artist profile timeline shows **published upcoming events** by default. Past published events are available via a separate paginated query parameter (`?timeline=past`).

**Rationale**:
- The primary use case for the artist profile is "what's coming up for this artist?"
- Past events are secondary context. Including them by default bloats the response.
- Draft, cancelled, and ended-but-not-past concerts are excluded from the public timeline, consistent with the existing public catalog filter.

### Decision 8: Minimal admin/organizer artist management

**Choice**: Provide:
1. `POST /admin/artists` — Admin creates an artist (name, slug, bio, status).
2. `PATCH /admin/artists/:id` — Admin updates artist fields.
3. `POST /admin/artists/:id/avatar` — Admin uploads artist avatar (reuses poster upload validation pattern).
4. `POST /admin/artists/:id/poster` — Admin uploads artist poster/cover image.
5. `PUT /organizer/concerts/:id/artists` — Organizer sets the artist list for a concert they own (replace semantics).
6. `PUT /admin/concerts/:id/artists` — Admin sets the artist list for any concert.

**Rationale**:
- Artist creation is admin-only to maintain data quality (artists are shared across concerts/organizers).
- Organizers can link existing artists to their own concerts but cannot create or edit artist profiles.
- The `PUT` semantics for concert-artist linking is idempotent: the submitted list replaces the current list entirely.
- No deletion endpoint for artists in this change (artists can be set to INACTIVE status instead).

### Decision 9: Idempotent follow/favorite semantics

**Choice**:
- `POST /audience/artists/:id/follow` — Creates follow if not exists; returns 200 either way.
- `DELETE /audience/artists/:id/follow` — Removes follow if exists; returns 200 either way.
- `POST /audience/artists/:id/favorite` — Creates favorite if not exists; returns 200 and increments artist counter.
- `DELETE /audience/artists/:id/favorite` — Removes favorite if exists; returns 200 and decrements artist counter.

**Rationale**:
- Idempotent endpoints prevent double-action bugs from network retries or UI race conditions.
- Using POST/DELETE (not PUT/PATCH) clearly communicates create/remove semantics.
- The `ArtistFollow` and `ArtistFavorite` tables use `@@unique([userId, artistId])` to enforce at-most-one relation. Upsert/delete-if-exists patterns handle idempotency at the database level.

### Decision 10: Multi-artist concert display in public catalog

**Choice**: Public concert list and detail responses gain an optional `artists` array field containing `PublicConcertArtist` objects (id, slug, displayName, avatarAsset). The existing `artistName` string remains unchanged.

**Rationale**:
- Adding `artists` as optional (defaulting to `[]` when no artists are linked) is backward-compatible.
- Clients that don't know about `artists` continue to use `artistName`.
- New clients can render richer artist links using the structured `artists` array.

### Decision 11: Module structure

**Choice**: New `packages/backend/src/artist-discovery/` module following the existing pattern:
```
artist-discovery/
  domain/
    artist.entity.ts
    artist.types.ts
    errors.ts
    ports/
      artist-repository.port.ts
  application/
    use-cases/
      list-artists.use-case.ts
      get-artist-profile.use-case.ts
      get-top-artists.use-case.ts
      follow-artist.use-case.ts
      unfavorite-artist.use-case.ts
      ... etc
  adapters/
    http/
      public-artist.controller.ts
      audience-artist.controller.ts
      admin-artist.controller.ts
    persistence/
      prisma-artist.repository.ts
  artist-discovery.module.ts
```

**Rationale**: Follows the same clean architecture pattern as `concert-management`, `ai-artist-bio`, and `identity` modules. Domain layer has no framework dependencies. Application use-cases depend on port interfaces. HTTP adapters map to/from shared contracts.

## Risks / Trade-offs

**[Denormalized favorite counter drift]** → If the increment/decrement fails after the `ArtistFavorite` row is created/deleted, the counter can drift. **Mitigation**: Use a database transaction that wraps both the row operation and the counter update. Add a periodic reconciliation job (out of scope for this change but noted).

**[artistName divergence from linked artists]** → Over time, `artistName` and the linked `Artist` records may diverge in content. **Mitigation**: Document that `artistName` is the legacy display label. Future work may auto-sync or deprecate it. For now, both are maintained independently.

**[Top artists query under high favorite churn]** → The denormalized counter approach works well for moderate traffic. Under extreme churn, atomic updates could cause contention. **Mitigation**: Acceptable for current scale. If needed, switch to periodic batch aggregation later.

**[No full-text search on artists]** → The initial artist list search uses `ILIKE` on `displayName`. This is sufficient for small-to-medium artist catalogs. **Mitigation**: Add PostgreSQL `tsvector` or external search index if the artist catalog grows large.

**[Circular dependency risk between modules]** → `concert-management` needs to query `ConcertArtist` data for public responses; `artist-discovery` needs to query concerts for the timeline. **Mitigation**: Both modules read from shared Prisma models. No direct module-to-module import. Public response composition happens in the HTTP adapter layer using repository queries.

## Migration Plan

1. **Database migration**: Add `Artist`, `ConcertArtist`, `ArtistFollow`, `ArtistFavorite` tables. Add `ARTIST_AVATAR` and `ARTIST_POSTER` to `AssetKind` enum. Add `ArtistStatus` enum.
2. **Seed update**: Create demo `Artist` records and `ConcertArtist` links matching existing seed `artistName` values.
3. **Backend deployment**: Deploy new module and updated concert queries. All new endpoints are additive — no existing endpoint changes behavior.
4. **Contract package**: Publish updated `@ticketbox/api-types` with new artist schemas. Existing schemas remain unchanged (only extended with optional `artists` array).
5. **Rollback**: Drop new tables and enum values. Revert code. No data in existing tables is modified by this change, so rollback is safe.

## Open Questions

1. **Should organizers be able to create artist records, or only admins?** Current decision: admin-only. May revisit if organizer self-service is needed.
2. **Should the artist timeline include events from all organizers or only the viewing organizer's events?** Current decision: public timeline shows all published events regardless of organizer — this is audience-facing.
3. **Should artist avatar/poster upload validation reuse the exact same image validation (magic bytes, size limits) as concert poster uploads?** Likely yes, but specific max sizes for avatar vs poster may differ. Defer exact limits to implementation.
