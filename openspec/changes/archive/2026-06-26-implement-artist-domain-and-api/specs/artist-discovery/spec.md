## ADDED Requirements

### Requirement: Artist domain model
The system SHALL maintain an `Artist` entity with `id` (UUID), `slug` (unique, URL-safe), `displayName`, optional `bio` text, optional `avatarAssetId` referencing an `Asset` of kind `ARTIST_AVATAR`, optional `posterAssetId` referencing an `Asset` of kind `ARTIST_POSTER`, `status` (`ACTIVE` or `INACTIVE`), `followerCount` (non-negative integer, default 0), `favoriteCount` (non-negative integer, default 0), `createdAt`, and `updatedAt`.

#### Scenario: Artist record is persisted with required fields
- **WHEN** an admin creates an artist with a valid slug, display name, and status
- **THEN** the system SHALL persist the artist with a generated UUID, the provided slug, display name, status, zero follower and favorite counts, and current timestamps

#### Scenario: Artist slug is unique
- **WHEN** an admin attempts to create an artist with a slug that already exists
- **THEN** the system SHALL reject the request with a conflict error

#### Scenario: Artist slug is URL-safe
- **WHEN** an admin creates or updates an artist with a slug containing characters that are not lowercase alphanumeric, hyphens, or underscores
- **THEN** the system SHALL reject the request with a validation error

#### Scenario: Artist bio is optional
- **WHEN** an artist is created without a bio
- **THEN** the system SHALL persist the artist with a null bio field

#### Scenario: Inactive artist is excluded from public queries
- **WHEN** a public API queries for artists
- **THEN** the system SHALL exclude artists with status `INACTIVE` from the response

### Requirement: Many-to-many artist–concert relationship
The system SHALL support a many-to-many relationship between `Artist` and `Concert` through a `ConcertArtist` join table with `concertId`, `artistId`, `displayOrder` (integer, default 0), and `createdAt`. The relationship SHALL NOT replace the existing `Concert.artistName` field.

#### Scenario: Artist is linked to a concert
- **WHEN** an organizer or admin links an artist to a concert they are authorized to manage
- **THEN** the system SHALL create a `ConcertArtist` record associating the artist with the concert

#### Scenario: Multiple artists are linked to one concert
- **WHEN** an organizer or admin links three artists to the same concert with display orders 0, 1, and 2
- **THEN** the system SHALL persist all three `ConcertArtist` records for that concert

#### Scenario: One artist appears in multiple concerts
- **WHEN** the same artist is linked to two different concerts
- **THEN** the system SHALL persist separate `ConcertArtist` records for each concert

#### Scenario: Duplicate artist–concert link is rejected
- **WHEN** an organizer or admin attempts to link an artist to a concert where the link already exists
- **THEN** the system SHALL reject the duplicate with a conflict error or handle it idempotently via replace semantics

#### Scenario: Concert artistName remains unchanged
- **WHEN** artists are linked to a concert via `ConcertArtist`
- **THEN** the system SHALL NOT modify the existing `Concert.artistName` field

### Requirement: Public artist list with search
The system SHALL expose a public endpoint to list active artists with optional text search on display name and cursor-based or offset pagination.

#### Scenario: Audience lists all active artists
- **WHEN** an unauthenticated user requests the public artist list without search parameters
- **THEN** the system SHALL return active artists ordered by display name with pagination metadata

#### Scenario: Audience searches artists by name
- **WHEN** an unauthenticated user requests the public artist list with a search query
- **THEN** the system SHALL return active artists whose display name matches the query (case-insensitive partial match)

#### Scenario: Inactive artists are excluded from public list
- **WHEN** the database contains both active and inactive artists
- **THEN** the public artist list SHALL return only active artists

#### Scenario: Empty search returns empty list
- **WHEN** an unauthenticated user searches for an artist name that matches no active artists
- **THEN** the system SHALL return an empty list with pagination metadata indicating zero results

### Requirement: Public artist profile by slug
The system SHALL expose a public endpoint to retrieve an active artist profile by slug, including identity fields, asset metadata, engagement counts, and an event timeline.

#### Scenario: Audience views artist profile
- **WHEN** an unauthenticated user requests an artist profile by a valid slug for an active artist
- **THEN** the system SHALL return the artist's id, slug, displayName, bio, avatarAsset metadata, posterAsset metadata, followerCount, favoriteCount, upcoming published concerts where the artist appears, and pastEventCount

#### Scenario: Artist profile excludes draft and cancelled concerts
- **WHEN** an artist is linked to concerts in DRAFT, CANCELLED, or ENDED status
- **THEN** the artist profile timeline SHALL exclude those concerts and only include published upcoming concerts

#### Scenario: Artist profile includes past event count
- **WHEN** an artist has appeared in past published concerts
- **THEN** the artist profile SHALL include `pastEventCount` as a non-negative integer without listing the past events inline

#### Scenario: Inactive artist profile returns not found
- **WHEN** an unauthenticated user requests an artist profile by slug for an inactive artist
- **THEN** the system SHALL return a not-found response without revealing the artist exists

#### Scenario: Non-existent slug returns not found
- **WHEN** an unauthenticated user requests an artist profile by a slug that does not exist
- **THEN** the system SHALL return a not-found response

#### Scenario: Artist profile does not expose private user identities
- **WHEN** the system returns an artist profile with followerCount and favoriteCount
- **THEN** the response SHALL NOT include any user IDs, emails, or other personally identifiable information of followers or fans

### Requirement: Top favorite artists
The system SHALL expose a public endpoint to retrieve a ranked list of artists ordered by descending favorite count for use on the homepage rail.

#### Scenario: Homepage fetches top favorite artists
- **WHEN** an unauthenticated user requests the top favorite artists endpoint
- **THEN** the system SHALL return active artists ordered by descending favoriteCount, limited to a configurable maximum (default 10)

#### Scenario: Top artists response includes summary data
- **WHEN** the top favorite artists endpoint responds
- **THEN** each artist item SHALL include id, slug, displayName, avatarAsset metadata, and favoriteCount

#### Scenario: Artists with zero favorites are included if insufficient ranked artists exist
- **WHEN** fewer than the requested limit of artists have favoriteCount greater than zero
- **THEN** the system SHALL include artists with zero favorites to fill the response, ordered by display name as a secondary sort

#### Scenario: Inactive artists are excluded from top artists
- **WHEN** an inactive artist has a high favorite count
- **THEN** the top favorite artists endpoint SHALL exclude that artist

### Requirement: Artist event timeline
The system SHALL provide artist event timeline data showing concerts where the artist appears, scoped to published events visible to the public.

#### Scenario: Timeline shows upcoming published events by default
- **WHEN** an unauthenticated user views an artist profile or requests the artist timeline
- **THEN** the system SHALL return published concerts with `startsAt` in the future, ordered by ascending `startsAt`

#### Scenario: Past published events are available via query parameter
- **WHEN** an unauthenticated user requests the artist timeline with `?timeline=past`
- **THEN** the system SHALL return published concerts with `startsAt` in the past, ordered by descending `startsAt`, with pagination

#### Scenario: Draft, cancelled, and ended concerts are excluded from timeline
- **WHEN** an artist is linked to concerts in DRAFT, CANCELLED, or ENDED status
- **THEN** the timeline SHALL exclude those concerts regardless of timeline filter

### Requirement: AUDIENCE follow artist
The system SHALL allow authenticated users with the AUDIENCE role to follow and unfollow artists. Follow creates a persistent `ArtistFollow` record indicating the user wants updates about the artist.

#### Scenario: Audience user follows an artist
- **WHEN** an authenticated AUDIENCE user sends a follow request for an active artist they are not currently following
- **THEN** the system SHALL create an `ArtistFollow` record with the user ID and artist ID, increment the artist's `followerCount`, and return success

#### Scenario: Duplicate follow is idempotent
- **WHEN** an authenticated AUDIENCE user sends a follow request for an artist they already follow
- **THEN** the system SHALL return success without creating a duplicate record or incrementing the counter again

#### Scenario: Audience user unfollows an artist
- **WHEN** an authenticated AUDIENCE user sends an unfollow request for an artist they currently follow
- **THEN** the system SHALL delete the `ArtistFollow` record, decrement the artist's `followerCount`, and return success

#### Scenario: Unfollow when not following is safe
- **WHEN** an authenticated AUDIENCE user sends an unfollow request for an artist they do not follow
- **THEN** the system SHALL return success without modifying any data

#### Scenario: Non-AUDIENCE role cannot follow
- **WHEN** an authenticated user without the AUDIENCE role attempts to follow an artist
- **THEN** the system SHALL reject the request with a forbidden error

#### Scenario: Following an inactive artist is rejected
- **WHEN** an authenticated AUDIENCE user attempts to follow an inactive artist
- **THEN** the system SHALL reject the request with a not-found response

### Requirement: AUDIENCE favorite artist
The system SHALL allow authenticated users with the AUDIENCE role to favorite and unfavorite artists. Favorite creates a persistent `ArtistFavorite` record indicating the user marks the artist as liked/saved. The `favoriteCount` on the `Artist` entity is used for the top artists ranking.

#### Scenario: Audience user favorites an artist
- **WHEN** an authenticated AUDIENCE user sends a favorite request for an active artist they have not favorited
- **THEN** the system SHALL create an `ArtistFavorite` record with the user ID and artist ID, increment the artist's `favoriteCount`, and return success

#### Scenario: Duplicate favorite is idempotent
- **WHEN** an authenticated AUDIENCE user sends a favorite request for an artist they have already favorited
- **THEN** the system SHALL return success without creating a duplicate record or incrementing the counter again

#### Scenario: Audience user unfavorites an artist
- **WHEN** an authenticated AUDIENCE user sends an unfavorite request for an artist they have favorited
- **THEN** the system SHALL delete the `ArtistFavorite` record, decrement the artist's `favoriteCount`, and return success

#### Scenario: Unfavorite when not favorited is safe
- **WHEN** an authenticated AUDIENCE user sends an unfavorite request for an artist they have not favorited
- **THEN** the system SHALL return success without modifying any data

#### Scenario: Non-AUDIENCE role cannot favorite
- **WHEN** an authenticated user without the AUDIENCE role attempts to favorite an artist
- **THEN** the system SHALL reject the request with a forbidden error

#### Scenario: Favoriting an inactive artist is rejected
- **WHEN** an authenticated AUDIENCE user attempts to favorite an inactive artist
- **THEN** the system SHALL reject the request with a not-found response

### Requirement: Viewer engagement state in artist responses
The system SHALL include the current authenticated viewer's follow and favorite state in artist profile responses when the request is authenticated with the AUDIENCE role.

#### Scenario: Authenticated audience user sees own engagement state
- **WHEN** an authenticated AUDIENCE user requests an artist profile
- **THEN** the response SHALL include `viewerFollowing` (boolean) and `viewerFavorited` (boolean) fields indicating whether the requesting user follows and has favorited the artist

#### Scenario: Unauthenticated request omits viewer state
- **WHEN** an unauthenticated user requests an artist profile
- **THEN** the response SHALL omit `viewerFollowing` and `viewerFavorited` fields or set them to null

#### Scenario: Non-AUDIENCE authenticated user omits viewer state
- **WHEN** an authenticated user without the AUDIENCE role requests an artist profile
- **THEN** the response SHALL omit `viewerFollowing` and `viewerFavorited` fields or set them to null

### Requirement: Admin artist management
The system SHALL allow authenticated admins to create, update, and manage artist records and their assets through admin endpoints.

#### Scenario: Admin creates an artist
- **WHEN** an authenticated admin submits a valid artist creation request with slug, displayName, optional bio, and status
- **THEN** the system SHALL create the artist record and return the created artist

#### Scenario: Admin updates an artist
- **WHEN** an authenticated admin submits an update for an existing artist's displayName, bio, slug, or status
- **THEN** the system SHALL apply the update and return the updated artist

#### Scenario: Admin uploads artist avatar
- **WHEN** an authenticated admin uploads a valid PNG, JPEG, or WebP image as an artist avatar via multipart/form-data
- **THEN** the system SHALL validate the image, store it via ObjectStoragePort, create an Asset record with kind ARTIST_AVATAR, and associate it with the artist

#### Scenario: Admin uploads artist poster
- **WHEN** an authenticated admin uploads a valid PNG, JPEG, or WebP image as an artist poster via multipart/form-data
- **THEN** the system SHALL validate the image, store it via ObjectStoragePort, create an Asset record with kind ARTIST_POSTER, and associate it with the artist

#### Scenario: Non-admin cannot create or update artists
- **WHEN** an authenticated user without the ADMIN role attempts to create or update an artist
- **THEN** the system SHALL reject the request with a forbidden error

### Requirement: Concert artist linking by organizer and admin
The system SHALL allow organizers to set the artist list for concerts they own, and admins to set the artist list for any concert, using replace semantics.

#### Scenario: Organizer sets artist list for owned concert
- **WHEN** an authenticated organizer submits a list of artist IDs for a concert they own
- **THEN** the system SHALL replace all existing ConcertArtist records for that concert with the submitted list, preserving the submitted display order

#### Scenario: Admin sets artist list for any concert
- **WHEN** an authenticated admin submits a list of artist IDs for any concert
- **THEN** the system SHALL replace all existing ConcertArtist records for that concert with the submitted list

#### Scenario: Organizer cannot set artists for non-owned concert
- **WHEN** an authenticated organizer attempts to set the artist list for a concert they do not own
- **THEN** the system SHALL reject the request with a forbidden error

#### Scenario: Empty artist list clears concert artists
- **WHEN** an organizer or admin submits an empty artist list for a concert
- **THEN** the system SHALL remove all ConcertArtist records for that concert

#### Scenario: Non-existent artist ID is rejected
- **WHEN** an organizer or admin submits an artist list containing an ID that does not exist
- **THEN** the system SHALL reject the request with a validation error
