## Why

The ticketbox platform currently represents artist data as a single `artistName` string field on the `Concert` model. This prevents the platform from treating artists as first-class entities with profiles, images, bios, and audience engagement features. The audience web app needs artist profile pages, a "top artists" rail on the homepage, and the ability for AUDIENCE users to follow and favorite artists — none of which are possible without an Artist domain model and supporting APIs. Concerts in the real world frequently feature multiple artists, but the current schema only supports one artist name per concert. Introducing a proper Artist domain unlocks multi-artist concerts, artist discovery, and audience engagement — all critical for the upcoming `implement-audience-artist-pages` frontend change.

## What Changes

- **Introduce `Artist` entity**: New database model with id, slug, display name, optional bio/description, avatar asset, poster/cover asset, status (ACTIVE/INACTIVE), and timestamps. The artist bio/description field complements but does not replace the existing `ArtistBio` AI-generated per-concert bio system.
- **Many-to-many artist–concert relationship**: New `ConcertArtist` join table linking artists to concerts with display order. The existing `Concert.artistName` field is preserved as a legacy/fallback field; it is not removed.
- **Public artist APIs**: New unauthenticated endpoints for listing artists (with search/pagination), getting an artist profile by slug (with avatar, poster, bio, follower/favorite counts, event timeline), and fetching top favorite artists for the homepage rail.
- **AUDIENCE follow/favorite APIs**: New authenticated endpoints for AUDIENCE users to follow/unfollow and favorite/unfavorite artists. Both actions are idempotent. Reverse actions are safe when no relation exists.
- **Public concert responses updated**: Public concert detail and list responses gain an optional `artists` array showing linked Artist summaries alongside the existing `artistName` field.
- **Shared API contracts**: New and updated `@ticketbox/api-types` schemas for artist list, artist profile, top artists, follow/favorite actions, and concert artist references.
- **Seed data**: Demo artists seeded and linked to existing sample concerts for development and submission evidence.
- **Minimal management path**: A lightweight admin/organizer endpoint to attach/detach artists to concerts. No full artist CMS. Artist records can be created via seed or a minimal admin endpoint.
- **Asset reuse**: Artist avatar and poster/cover images use the existing `Asset` model and `ObjectStoragePort` infrastructure with new `AssetKind` values (`ARTIST_AVATAR`, `ARTIST_POSTER`).

## Capabilities

### New Capabilities
- `artist-discovery`: Covers the Artist domain model, public artist listing/search/profile APIs, top favorite artists endpoint, artist event timeline, AUDIENCE follow/favorite APIs, and the `ConcertArtist` many-to-many relationship.

### Modified Capabilities
- `concert-management`: Public concert detail and list responses gain an optional `artists` array. `ConcertArtist` join table is added. Organizer/admin endpoints gain minimal artist-attach/detach capability. Existing `artistName` field behavior is preserved.
- `shared-api-contracts`: New Zod schemas and types for artist list, artist profile, top artists, follow/favorite request/response, and `PublicConcertArtist` reference shapes. Updated concert response schemas to include optional `artists` array.
- `submission-readiness`: Seed script updated to create demo Artist records and link them to sample concerts for local development evidence.

## Impact

- **Database**: New `Artist`, `ConcertArtist`, `ArtistFollow`, `ArtistFavorite` tables. New `AssetKind` enum values `ARTIST_AVATAR` and `ARTIST_POSTER`. New `ArtistStatus` enum. Migration required.
- **Backend**: New `artist-discovery` module with domain, application, and HTTP adapter layers following existing NestJS module patterns. Modifications to `concert-management` module for join-table queries and public response composition. Modifications to `catalog-search-api` query logic to include artist data.
- **Shared packages**: `@ticketbox/api-types` gains new `artist/` contract submodule and updated `catalog/` contracts.
- **Existing behavior**: `Concert.artistName` remains populated and returned. No breaking changes to existing public or organizer/admin concert APIs. Existing `ArtistBio` AI module continues to operate per-concert; artist profile bio/description is a separate field on the `Artist` entity.
- **Infrastructure**: Reuses existing `ObjectStoragePort`, `Asset` model, and upload patterns for artist images. No new infrastructure dependencies.
- **Frontend**: No audience UI changes in this change (deferred to `implement-audience-artist-pages`). Organizer/admin UI changes are minimal or deferred.
