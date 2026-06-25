## 1. Database Schema & Migration

- [x] 1.1 Add `ArtistStatus` enum (`ACTIVE`, `INACTIVE`) to Prisma schema
- [x] 1.2 Add `ARTIST_AVATAR` and `ARTIST_POSTER` values to `AssetKind` enum in Prisma schema
- [x] 1.3 Create `Artist` model in Prisma schema with fields: `id` (UUID), `slug` (unique VarChar), `displayName` (VarChar), `bio` (optional text), `avatarAssetId` (optional UUID FK to Asset), `posterAssetId` (optional UUID FK to Asset), `status` (ArtistStatus, default ACTIVE), `followerCount` (Int, default 0), `favoriteCount` (Int, default 0), `createdAt`, `updatedAt`. Add indexes on `slug`, `status`, and `(status, favoriteCount)`.
- [x] 1.4 Create `ConcertArtist` join model in Prisma schema with fields: `concertId` (UUID FK), `artistId` (UUID FK), `displayOrder` (Int, default 0), `createdAt`. Composite primary key `(concertId, artistId)`. Add index on `artistId`.
- [x] 1.5 Create `ArtistFollow` model in Prisma schema with fields: `id` (UUID), `userId` (UUID FK to User), `artistId` (UUID FK to Artist), `createdAt`. Unique constraint on `(userId, artistId)`. Add index on `artistId`.
- [x] 1.6 Create `ArtistFavorite` model in Prisma schema with fields: `id` (UUID), `userId` (UUID FK to User), `artistId` (UUID FK to Artist), `createdAt`. Unique constraint on `(userId, artistId)`. Add index on `artistId`.
- [x] 1.7 Add reverse relations to `User` model for `ArtistFollow[]` and `ArtistFavorite[]`
- [x] 1.8 Add reverse relations to `Concert` model for `ConcertArtist[]` (named `concertArtists`)
- [x] 1.9 Add reverse relations to `Asset` model for artist avatar and poster references
- [x] 1.10 Generate and verify Prisma migration (`npx prisma migrate dev --name add-artist-domain`)

## 2. Shared API Contracts (`@ticketbox/api-types`)

- [x] 2.1 Create `packages/api-types/src/artist/` directory and `artist.contract.ts` file
- [x] 2.2 Define `PublicConcertArtistSchema` (id, slug, displayName, avatarAsset nullable) with Zod
- [x] 2.3 Define `PublicArtistSummarySchema` (id, slug, displayName, avatarAsset nullable, favoriteCount) with Zod
- [x] 2.4 Define `PublicArtistTimelineEventSchema` (id, slug, title, artistName, venueName, city, startsAt, endsAt, eventType, posterAsset nullable) with Zod
- [x] 2.5 Define `PublicArtistProfileSchema` (id, slug, displayName, bio nullable, avatarAsset nullable, posterAsset nullable, followerCount, favoriteCount, upcomingEvents array, pastEventCount, viewerFollowing nullable boolean, viewerFavorited nullable boolean) with Zod
- [x] 2.6 Define `PublicTopArtistSchema` (id, slug, displayName, avatarAsset nullable, favoriteCount) with Zod
- [x] 2.7 Define `PublicArtistListResponseSchema` (items array, total, limit, offset) with Zod
- [x] 2.8 Define `TopArtistListResponseSchema` as array of `PublicTopArtistSchema` with Zod
- [x] 2.9 Define `ArtistSearchParamsSchema` (optional q, optional limit, optional offset) with Zod
- [x] 2.10 Define `ArtistFollowResponseSchema` (artistId, following boolean) and `ArtistFavoriteResponseSchema` (artistId, favorited boolean) with Zod
- [x] 2.11 Extend `PublicConcertSummarySchema` and `PublicConcertDetailResponseSchema` in `catalog/public-concert.contract.ts` with optional `artists` array field (array of `PublicConcertArtistSchema`, default `[]`)
- [x] 2.12 Export all new schemas and types from `packages/api-types/src/index.ts`
- [x] 2.13 Build `@ticketbox/api-types` (`npm run build -w @ticketbox/api-types`) and verify no type errors

## 3. Artist Domain Layer

- [x] 3.1 Create `packages/backend/src/artist-discovery/` module directory structure: `domain/`, `domain/ports/`, `application/use-cases/`, `adapters/http/`, `adapters/persistence/`
- [x] 3.2 Create `domain/artist.types.ts` with `ArtistStatus` enum, `ArtistRecord`, `ArtistSummary`, `ArtistProfile`, `ConcertArtistRecord`, `ArtistFollowRecord`, `ArtistFavoriteRecord` interfaces
- [x] 3.3 Create `domain/errors.ts` with `ArtistNotFoundError`, `ArtistSlugConflictError`, `ArtistSlugInvalidError`, `ArtistAlreadyFollowedError`, `ArtistAlreadyFavoritedError` error classes
- [x] 3.4 Create `domain/ports/artist-repository.port.ts` with `ArtistRepositoryPort` interface defining: `findBySlug`, `findById`, `findActive`, `findTopByFavorites`, `create`, `update`, `findConcertArtists`, `setConcertArtists`, `findFollow`, `createFollow`, `deleteFollow`, `findFavorite`, `createFavorite`, `deleteFavorite`, `incrementFollowerCount`, `decrementFollowerCount`, `incrementFavoriteCount`, `decrementFavoriteCount`, `findUpcomingEventsByArtist`, `countPastEventsByArtist`

## 4. Artist Application Use Cases

- [x] 4.1 Create `application/use-cases/list-artists.use-case.ts` — query active artists with optional search, pagination (limit/offset)
- [x] 4.2 Create `application/use-cases/get-artist-profile.use-case.ts` — fetch active artist by slug with engagement counts, upcoming events, past event count, and optional viewer state
- [x] 4.3 Create `application/use-cases/get-top-artists.use-case.ts` — fetch active artists ranked by descending favoriteCount with configurable limit
- [x] 4.4 Create `application/use-cases/follow-artist.use-case.ts` — idempotent follow: create ArtistFollow if not exists, increment followerCount transactionally; skip if already following
- [x] 4.5 Create `application/use-cases/unfollow-artist.use-case.ts` — idempotent unfollow: delete ArtistFollow if exists, decrement followerCount transactionally; skip if not following
- [x] 4.6 Create `application/use-cases/favorite-artist.use-case.ts` — idempotent favorite: create ArtistFavorite if not exists, increment favoriteCount transactionally; skip if already favorited
- [x] 4.7 Create `application/use-cases/unfavorite-artist.use-case.ts` — idempotent unfavorite: delete ArtistFavorite if exists, decrement favoriteCount transactionally; skip if not favorited
- [x] 4.8 Create `application/use-cases/create-artist.use-case.ts` — admin creates artist with slug validation and conflict check
- [x] 4.9 Create `application/use-cases/update-artist.use-case.ts` — admin updates artist fields with slug uniqueness enforcement
- [x] 4.10 Create `application/use-cases/set-concert-artists.use-case.ts` — replace all ConcertArtist records for a concert with submitted list; validate all artist IDs exist; enforce concert ownership for organizers
- [x] 4.11 Create `application/use-cases/upload-artist-avatar.use-case.ts` — validate image, store via ObjectStoragePort, create Asset with kind ARTIST_AVATAR, update artist.avatarAssetId; handle re-upload replacement
- [x] 4.12 Create `application/use-cases/upload-artist-poster.use-case.ts` — validate image, store via ObjectStoragePort, create Asset with kind ARTIST_POSTER, update artist.posterAssetId; handle re-upload replacement

## 5. Artist Persistence Adapter

- [x] 5.1 Create `adapters/persistence/prisma-artist.repository.ts` implementing `ArtistRepositoryPort` using Prisma client
- [x] 5.2 Implement `findBySlug` — query by slug with status ACTIVE filter, include avatar and poster asset relations
- [x] 5.3 Implement `findActive` — list active artists with optional ILIKE search on displayName, offset/limit pagination, total count
- [x] 5.4 Implement `findTopByFavorites` — query active artists ordered by descending favoriteCount then displayName, with limit
- [x] 5.5 Implement `create` and `update` — standard Prisma create/update with slug uniqueness handling
- [x] 5.6 Implement `setConcertArtists` — delete all ConcertArtist for concertId, then createMany with submitted artist IDs and display orders (in a transaction)
- [x] 5.7 Implement `findFollow`/`createFollow`/`deleteFollow` — query, upsert, delete on ArtistFollow with `(userId, artistId)` unique
- [x] 5.8 Implement `findFavorite`/`createFavorite`/`deleteFavorite` — query, upsert, delete on ArtistFavorite with `(userId, artistId)` unique
- [x] 5.9 Implement `incrementFollowerCount`/`decrementFollowerCount`/`incrementFavoriteCount`/`decrementFavoriteCount` — atomic Prisma `update` with `increment`/`decrement` wrapped in the same transaction as the row operation
- [x] 5.10 Implement `findUpcomingEventsByArtist` — query ConcertArtist join → Concert where status=PUBLISHED and startsAt > now, ordered by ascending startsAt, include poster asset
- [x] 5.11 Implement `countPastEventsByArtist` — count ConcertArtist join → Concert where status=PUBLISHED and startsAt <= now

## 6. Artist HTTP Adapters (Controllers)

- [x] 6.1 Create `adapters/http/public-artist.controller.ts` with unauthenticated endpoints:
  - `GET /public/artists` — list artists with search/pagination
  - `GET /public/artists/top` — top favorite artists
  - `GET /public/artists/:slug` — artist profile by slug (with optional auth for viewer state)
- [x] 6.2 Create `adapters/http/audience-artist.controller.ts` with AUDIENCE-authenticated endpoints:
  - `POST /audience/artists/:id/follow` — follow artist
  - `DELETE /audience/artists/:id/follow` — unfollow artist
  - `POST /audience/artists/:id/favorite` — favorite artist
  - `DELETE /audience/artists/:id/favorite` — unfavorite artist
- [x] 6.3 Create `adapters/http/admin-artist.controller.ts` with ADMIN-authenticated endpoints:
  - `POST /admin/artists` — create artist
  - `PATCH /admin/artists/:id` — update artist
  - `POST /admin/artists/:id/avatar` — upload artist avatar (multipart/form-data)
  - `POST /admin/artists/:id/poster` — upload artist poster (multipart/form-data)
- [x] 6.4 Add concert artist linking endpoints to existing or new controllers:
  - `PUT /organizer/concerts/:id/artists` — organizer sets artist list (ownership enforced)
  - `PUT /admin/concerts/:id/artists` — admin sets artist list

## 7. NestJS Module Wiring

- [x] 7.1 Create `artist-discovery.module.ts` — NestJS module registering controllers, providing use cases, injecting repository and storage ports
- [x] 7.2 Register `ArtistDiscoveryModule` in the root app module
- [x] 7.3 Add RBAC guard configuration for audience, admin, and public artist endpoints matching existing guard patterns
- [x] 7.4 Update asset serving scope to include `ARTIST_AVATAR` and `ARTIST_POSTER` asset kinds if the public asset endpoint (`GET /assets/:id`) currently restricts to POSTER and SEATING_MAP only

## 8. Concert Response Composition

- [x] 8.1 Update concert public catalog list query to include `concertArtists` with related `artist` and `artist.avatarAsset` (where artist status is ACTIVE), ordered by displayOrder
- [x] 8.2 Update concert public catalog detail query to include `concertArtists` with related `artist` and `artist.avatarAsset` (where artist status is ACTIVE), ordered by displayOrder
- [x] 8.3 Update public concert list response mapper to populate the `artists` array from concertArtists relation, mapping to `PublicConcertArtist` shape
- [x] 8.4 Update public concert detail response mapper to populate the `artists` array from concertArtists relation, mapping to `PublicConcertArtist` shape

## 9. Seed Data

- [x] 9.1 Update seed script to create demo Artist records matching existing sample concert `artistName` values (e.g., "Anh Trai Say Hi") with generated slugs, ACTIVE status, and optional placeholder bios
- [x] 9.2 Update seed script to create ConcertArtist records linking demo artists to corresponding sample concerts
- [x] 9.3 Ensure seed script is idempotent — use upsert or existence checks to avoid duplicates on re-run
- [x] 9.4 Verify seed script does not modify existing `Concert.artistName` values

## 10. Testing

- [x] 10.1 Write unit tests for artist domain use cases: list, profile, top artists, follow/unfollow, favorite/unfavorite, create, update, set concert artists
- [x] 10.2 Write unit tests verifying idempotent follow/favorite semantics (duplicate follow returns success, unfollow when not following returns success)
- [x] 10.3 Write unit tests verifying AUDIENCE role enforcement on follow/favorite endpoints
- [x] 10.4 Write unit tests verifying admin role enforcement on artist create/update endpoints
- [x] 10.5 Write contract tests validating all new `@ticketbox/api-types` artist schemas against sample response fixtures
- [x] 10.6 Write integration tests for public artist list, profile, and top artists endpoints
- [x] 10.7 Write integration tests for audience follow/favorite endpoints
- [x] 10.8 Write integration tests for admin artist create/update endpoints
- [x] 10.9 Write integration tests for concert artist linking endpoints (organizer and admin)
- [x] 10.10 Write integration tests verifying public concert list and detail responses include `artists` array
- [x] 10.11 Verify that existing concert management, catalog, and AI artist bio tests continue to pass without modification

## 11. Build Verification

- [x] 11.1 Run full project build and verify no type errors across all packages
- [x] 11.2 Run full test suite and verify all tests pass
- [x] 11.3 Run seed script against a fresh database and verify demo artists and concert links are created correctly
- [x] 11.4 Manually verify public artist endpoints return expected responses using seeded data
