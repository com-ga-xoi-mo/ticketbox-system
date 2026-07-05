## ADDED Requirements

### Requirement: Protected admin artist catalog query
The system SHALL expose a protected paginated admin artist query that can search and filter both ACTIVE and INACTIVE artist records and returns safe avatar/poster metadata.

#### Scenario: Admin lists artists of all statuses
- **WHEN** an authenticated admin requests the artist catalog without a status filter
- **THEN** the system SHALL return ACTIVE and INACTIVE artists with total, limit, and offset metadata

#### Scenario: Admin filters and searches artists
- **WHEN** an admin supplies a valid status and text query
- **THEN** the system SHALL return matching artists using case-insensitive display-name search and stable pagination ordering

#### Scenario: Organizer cannot list protected catalog
- **WHEN** an organizer requests the protected admin artist catalog
- **THEN** the system SHALL reject the request as forbidden

#### Scenario: Protected artist metadata is safe
- **WHEN** the admin catalog returns avatar or poster metadata
- **THEN** it SHALL include public fields required for rendering and SHALL exclude storage keys, checksums, uploader IDs, and binary content

### Requirement: Validated admin artist commands
Admin artist create, update, avatar upload, and poster upload endpoints SHALL use strict validated HTTP contracts rather than untyped request bodies.

#### Scenario: Unknown artist field is rejected
- **WHEN** an admin create or update request includes a field outside the canonical contract
- **THEN** strict request validation SHALL reject the request

#### Scenario: Invalid artist status is rejected
- **WHEN** an admin submits a status outside ACTIVE or INACTIVE
- **THEN** the system SHALL reject the request with a validation error

#### Scenario: Image upload follows canonical validation
- **WHEN** an admin uploads an artist avatar or poster
- **THEN** the endpoint SHALL enforce the existing raster MIME, signature, and size requirements and map failures without exposing storage internals

## MODIFIED Requirements

### Requirement: Many-to-many artist–concert relationship
The system SHALL support a many-to-many relationship between `Artist` and `Concert` through a `ConcertArtist` join table with `concertId`, `artistId`, unique contiguous `displayOrder` beginning at zero, and `createdAt`. The relationship SHALL retain the existing `Concert.artistName` field as a compatibility projection synchronized from the primary linked artist on successful non-empty replacement.

#### Scenario: Artist is linked to a concert
- **WHEN** an organizer or admin links an active artist to a concert they are authorized to manage
- **THEN** the system SHALL create a `ConcertArtist` record associating the artist with the concert

#### Scenario: Multiple artists are linked to one concert
- **WHEN** an organizer or admin replaces links with three artists at display orders 0, 1, and 2
- **THEN** the system SHALL persist all three links in that order
- **AND** order 0 SHALL identify the primary artist

#### Scenario: One artist appears in multiple concerts
- **WHEN** the same artist is linked to two different concerts
- **THEN** the system SHALL persist separate `ConcertArtist` records for each concert

#### Scenario: Duplicate artist or order is rejected
- **WHEN** a replacement repeats an artist ID or display order
- **THEN** the system SHALL reject the entire replacement without partial writes

#### Scenario: Primary artist synchronizes legacy name
- **WHEN** a non-empty replacement succeeds
- **THEN** the system SHALL set `Concert.artistName` to the current display name of the artist at order 0 in the same transaction

#### Scenario: Empty links preserve legacy name
- **WHEN** an authorized user replaces links with an empty array
- **THEN** the system SHALL remove the links and preserve the current `Concert.artistName`

### Requirement: Admin artist management
The system SHALL allow authenticated admins to list, search, create, update, and manage artist records and their assets through strict admin contracts. Organizers SHALL NOT receive artist catalog mutation authority.

#### Scenario: Admin creates an artist
- **WHEN** an authenticated admin submits a valid artist creation request with slug, displayName, optional bio, and status
- **THEN** the system SHALL create the artist record and return the canonical management artist response

#### Scenario: Admin updates an artist
- **WHEN** an authenticated admin submits a valid update for an existing artist's displayName, bio, slug, or status
- **THEN** the system SHALL apply the update and return the canonical management artist response

#### Scenario: Admin searches managed artists
- **WHEN** an authenticated admin searches or filters the protected artist catalog
- **THEN** the system SHALL return matching ACTIVE and INACTIVE records with pagination metadata

#### Scenario: Admin uploads artist avatar
- **WHEN** an authenticated admin uploads a valid PNG, JPEG, or WebP image as an artist avatar
- **THEN** the system SHALL validate the image, store it through ObjectStoragePort, create an ARTIST_AVATAR asset, and associate it with the artist

#### Scenario: Admin uploads artist poster
- **WHEN** an authenticated admin uploads a valid PNG, JPEG, or WebP image as an artist poster
- **THEN** the system SHALL validate the image, store it through ObjectStoragePort, create an ARTIST_POSTER asset, and associate it with the artist

#### Scenario: Organizer cannot mutate artist catalog
- **WHEN** an organizer calls an admin artist create, update, status, avatar, or poster endpoint
- **THEN** the system SHALL reject the request as forbidden
