## ADDED Requirements

### Requirement: Artist public contract schemas
The shared contract package SHALL provide Zod schemas and inferred TypeScript types for artist public API responses, including artist summary, artist profile, top artists, and artist event timeline items.

#### Scenario: PublicArtistSummary schema validates artist list items
- **WHEN** `PublicArtistSummarySchema` is used to parse an artist list item
- **THEN** parsing SHALL succeed when the object includes `id` (UUID string), `slug` (non-empty string), `displayName` (non-empty string), `avatarAsset` (PublicAsset or null), and `favoriteCount` (non-negative integer)

#### Scenario: PublicArtistProfile schema validates full artist profile
- **WHEN** `PublicArtistProfileSchema` is used to parse an artist profile response
- **THEN** parsing SHALL succeed when the object includes `id`, `slug`, `displayName`, `bio` (string or null), `avatarAsset` (PublicAsset or null), `posterAsset` (PublicAsset or null), `followerCount` (non-negative integer), `favoriteCount` (non-negative integer), `upcomingEvents` (array of PublicArtistTimelineEvent), `pastEventCount` (non-negative integer), `viewerFollowing` (boolean or null), and `viewerFavorited` (boolean or null)

#### Scenario: PublicArtistTimelineEvent schema validates timeline items
- **WHEN** `PublicArtistTimelineEventSchema` is used to parse a timeline event item
- **THEN** parsing SHALL succeed when the object includes `id` (UUID string), `slug` (non-empty string), `title` (non-empty string), `artistName` (non-empty string), `venueName` (non-empty string), `city` (non-empty string), `startsAt` (ISO datetime string), `endsAt` (ISO datetime string), `eventType` (EventTypeCode), and `posterAsset` (PublicAsset or null)

#### Scenario: PublicTopArtist schema validates top artist items
- **WHEN** `PublicTopArtistSchema` is used to parse a top artist list item
- **THEN** parsing SHALL succeed when the object includes `id` (UUID string), `slug` (non-empty string), `displayName` (non-empty string), `avatarAsset` (PublicAsset or null), and `favoriteCount` (non-negative integer)

#### Scenario: PublicArtistListResponse schema validates paginated list
- **WHEN** `PublicArtistListResponseSchema` is used to parse a paginated artist list
- **THEN** parsing SHALL succeed when the object includes `items` (array of PublicArtistSummary), `total` (non-negative integer), `limit` (positive integer), and `offset` (non-negative integer)

#### Scenario: TopArtistListResponse schema validates top artists array
- **WHEN** `TopArtistListResponseSchema` is used to parse a top artists response
- **THEN** parsing SHALL succeed when the object is an array of PublicTopArtist items

### Requirement: Artist engagement action contract schemas
The shared contract package SHALL provide Zod schemas and inferred TypeScript types for audience follow/favorite actions on artists.

#### Scenario: ArtistFollowResponse schema validates follow action result
- **WHEN** `ArtistFollowResponseSchema` is used to parse a follow or unfollow response
- **THEN** parsing SHALL succeed when the object includes `artistId` (UUID string) and `following` (boolean)

#### Scenario: ArtistFavoriteResponse schema validates favorite action result
- **WHEN** `ArtistFavoriteResponseSchema` is used to parse a favorite or unfavorite response
- **THEN** parsing SHALL succeed when the object includes `artistId` (UUID string) and `favorited` (boolean)

### Requirement: Public concert artist reference contract schemas
The shared contract package SHALL provide a Zod schema for artist references within public concert responses.

#### Scenario: PublicConcertArtist schema validates concert artist references
- **WHEN** `PublicConcertArtistSchema` is used to parse a concert artist reference
- **THEN** parsing SHALL succeed when the object includes `id` (UUID string), `slug` (non-empty string), `displayName` (non-empty string), and `avatarAsset` (PublicAsset or null)

#### Scenario: Concert summary and detail schemas accept optional artists array
- **WHEN** `PublicConcertSummarySchema` and `PublicConcertDetailResponseSchema` are extended with an `artists` field
- **THEN** parsing SHALL succeed when the object includes `artists` as an array of PublicConcertArtist items, defaulting to an empty array when omitted

### Requirement: Artist contract schemas preserve architecture boundaries
The artist contract schemas SHALL depend only on Zod and existing shared contract types, and SHALL NOT import backend domain types, Prisma models, NestJS types, or mobile feature code.

#### Scenario: Artist contracts are framework-independent
- **WHEN** the artist contract files in `@ticketbox/api-types` are compiled
- **THEN** they SHALL depend only on Zod and other `@ticketbox/api-types` shared schemas

#### Scenario: Artist contracts do not leak backend types
- **WHEN** the exports of the artist contract module are inspected
- **THEN** they SHALL NOT expose Prisma `Artist`, `ArtistFollow`, `ArtistFavorite`, `ArtistStatus`, backend repository types, or NestJS decorator types

### Requirement: Artist search params contract schema
The shared contract package SHALL provide a Zod schema for artist list search/filter query parameters.

#### Scenario: ArtistSearchParams schema validates search query
- **WHEN** `ArtistSearchParamsSchema` is used to parse artist list query parameters
- **THEN** parsing SHALL succeed when the object includes optional `q` (non-empty string for text search), optional `limit` (positive integer), and optional `offset` (non-negative integer)
