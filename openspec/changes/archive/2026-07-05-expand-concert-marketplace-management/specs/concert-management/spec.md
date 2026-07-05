## ADDED Requirements

### Requirement: Protected concert marketplace projection
The system SHALL return a canonical management concert projection from admin and organizer list/detail endpoints containing existing concert fields, `eventType`, `posterAssetId`, `bannerAssetId`, safe `posterAsset` and `bannerAsset` metadata, ordered linked artists, SEO fields, `isFeatured`, and `displayOrder`.

#### Scenario: Protected read returns marketplace metadata
- **WHEN** an authorized admin or organizer reads a concert with linked assets and artists
- **THEN** the response SHALL include its marketplace fields, assets, and artists ordered by `displayOrder`
- **AND** it SHALL retain legacy `artistName`, `posterAssetId`, and `bannerAssetId`

#### Scenario: Protected assets exclude storage internals
- **WHEN** a protected concert response includes poster, banner, or artist avatar metadata
- **THEN** it SHALL NOT include storage keys, checksums, uploader IDs, credentials, or binary content

#### Scenario: Management read includes inactive linked artist
- **WHEN** a concert remains linked to an artist whose status changed to INACTIVE
- **THEN** the protected management response SHALL include that artist with its status and display order
- **AND** public audience responses SHALL continue to exclude that artist

### Requirement: Event type and SEO authoring
The system SHALL let an organizer create or update `eventType`, `seoTitle`, `seoDescription`, and `seoImageUrl` for an owned editable concert and SHALL let an admin update those fields for any editable existing concert. Concert creation SHALL remain organizer-only. For marketplace mutations, editable means exactly DRAFT or PUBLISHED; CANCELLED and ENDED concerts remain readable but immutable.

#### Scenario: Organizer creates concert without event type
- **WHEN** an organizer uses the existing create endpoint without `eventType`
- **THEN** the system SHALL create the concert with `eventType = CONCERT`

#### Scenario: Admin cannot create marketplace concert
- **WHEN** an admin attempts to create a concert with marketplace or moderation fields
- **THEN** no admin concert-create endpoint or shared contract SHALL be available
- **AND** the admin SHALL use the update endpoint to manage existing concerts

#### Scenario: Organizer updates marketplace content
- **WHEN** an organizer submits a supported event type and valid SEO fields for an owned editable concert
- **THEN** the system SHALL persist and return those values

#### Scenario: Cancelled or ended concert rejects marketplace content changes
- **WHEN** an organizer or admin attempts to update event type, SEO, artists, or banner for a CANCELLED or ENDED concert
- **THEN** the system SHALL reject the mutation without changing marketplace state

#### Scenario: Invalid event type is rejected
- **WHEN** a create or update request contains an event type outside `CONCERT`, `WORKSHOP`, `SPORT`, `MOVIE`, `THEATRE`, and `VOUCHER`
- **THEN** the system SHALL reject the request with a validation error

#### Scenario: Non-HTTPS SEO image is rejected
- **WHEN** a non-null `seoImageUrl` is not an absolute HTTPS URL
- **THEN** the system SHALL reject the request with a validation error

#### Scenario: Audience SEO image fallback remains compatible
- **WHEN** `seoImageUrl` is null for a public concert
- **THEN** the public detail contract SHALL continue to fall back to the poster public URL without changing audience behavior

### Requirement: Admin-only featured moderation
The system SHALL allow only admins to set `isFeatured` and non-negative integer `displayOrder` while updating an existing DRAFT or PUBLISHED concert. Concert creation remains organizer-only, and organizer create/update requests SHALL reject both moderation fields.

#### Scenario: Admin updates featured placement
- **WHEN** an admin updates `isFeatured` and `displayOrder` for a concert
- **THEN** the system SHALL persist the values and the featured public query SHALL reflect them according to its existing ordering rules

#### Scenario: Organizer moderation fields are rejected
- **WHEN** an organizer create or update request includes `isFeatured` or `displayOrder`
- **THEN** strict request validation SHALL reject the request

#### Scenario: Negative display order is rejected
- **WHEN** an admin submits a negative or non-integer `displayOrder`
- **THEN** the system SHALL reject the request with a validation error

### Requirement: Transactional ordered concert artist replacement
The system SHALL replace concert artists using unique artist IDs and a unique contiguous display order from zero, and SHALL synchronize the primary artist's display name to legacy `Concert.artistName` atomically with the replacement.

#### Scenario: Multiple active artists replace existing links
- **WHEN** an authorized user submits active artists ordered 0, 1, and 2
- **THEN** the system SHALL replace all links in one transaction
- **AND** it SHALL set `Concert.artistName` to the display name of the artist at order 0

#### Scenario: Empty replacement preserves legacy name
- **WHEN** an authorized user submits an empty artists array
- **THEN** the system SHALL remove all concert-artist links
- **AND** it SHALL leave the existing `Concert.artistName` unchanged

#### Scenario: Invalid replacement is rejected without partial writes
- **WHEN** a replacement contains a duplicate artist ID, duplicate order, negative order, non-contiguous order, or unknown artist
- **THEN** the system SHALL reject the entire operation without changing links or `artistName`

#### Scenario: Newly selected inactive artist is rejected
- **WHEN** a replacement attempts to add an INACTIVE artist not already linked to the concert
- **THEN** the system SHALL reject the operation without partial writes

#### Scenario: Existing inactive link can be retained
- **WHEN** a replacement retains an INACTIVE artist already linked to the same concert while reordering other artists
- **THEN** the system SHALL preserve that historical link and return it in management reads

#### Scenario: Organizer ownership is enforced
- **WHEN** an organizer replaces artists for a concert owned by another organizer
- **THEN** the system SHALL reject the operation as forbidden

#### Scenario: Concurrent replacements serialize
- **WHEN** two valid artist replacement requests target the same concert concurrently
- **THEN** the system SHALL lock and serialize replacement transactions so neither request produces mixed or partial links
- **AND** the last successfully committed complete replacement SHALL be the final artist list and legacy `artistName`

#### Scenario: Replacement refreshes public catalog
- **WHEN** artist replacement commits successfully
- **THEN** the system SHALL invalidate the public concert catalog cache so linked artists and the synchronized legacy name are refreshed

### Requirement: Concert banner lifecycle
The system SHALL allow an organizer to upload or replace a raster banner for an owned DRAFT or PUBLISHED concert and an admin to do so for any DRAFT or PUBLISHED concert through role-specific banner endpoints using the existing `bannerAssetId` relation. CANCELLED and ENDED concerts SHALL reject banner mutations.

#### Scenario: Organizer uploads valid banner
- **WHEN** an organizer uploads a valid PNG, JPEG, or WebP banner for an owned editable concert
- **THEN** the system SHALL store it through `ObjectStoragePort`, persist safe asset metadata and public URL, associate `bannerAssetId`, and return the updated banner metadata

#### Scenario: Admin uploads banner for any concert
- **WHEN** an admin uploads a valid banner for an editable concert
- **THEN** the system SHALL apply the same storage and association lifecycle with admin override

#### Scenario: Banner replacement cleans up old asset
- **WHEN** a new banner is successfully associated with a concert that had an old banner
- **THEN** the system SHALL delete the replaced object and metadata using the established poster replacement ordering

#### Scenario: Banner persistence failure is compensated
- **WHEN** the new object uploads but asset persistence or association fails
- **THEN** the system SHALL best-effort delete the new object and preserve the old banner association

#### Scenario: Invalid banner is rejected before storage
- **WHEN** an uploaded banner has an unsupported MIME type, invalid raster signature, or exceeds the existing poster image size limit
- **THEN** the system SHALL reject it before storing an object or mutating the concert

### Requirement: Artist mutation cache coherence
The system SHALL invalidate public artist caches and the public concert catalog cache after successful admin artist mutations that can change embedded linked-artist metadata or public eligibility.

#### Scenario: Artist metadata mutation refreshes linked concerts
- **WHEN** an admin successfully changes an artist display name, status, avatar, or poster
- **THEN** public artist reads and cached public concert responses SHALL be invalidated after persistence
- **AND** a cache invalidation failure SHALL be logged but SHALL NOT fail the successful mutation response or roll back committed data because existing TTL expiry remains the fallback

## MODIFIED Requirements

### Requirement: Organizer concert administration
The system SHALL allow authorized organizers to list, read, create, update, publish, and cancel concerts they own, including assigning poster, banner, and seating map assets, marketplace content, and ordered artists. Read endpoints scoped to the organizer SHALL include concerts in every status (DRAFT, PUBLISHED, CANCELLED, ENDED), unlike the public catalog which only exposes published, available concerts. Concert slug SHALL be editable through the update endpoint and use the same URL-safe validation as creation. Featured placement fields SHALL remain admin-only.

#### Scenario: Organizer creates a concert
- **WHEN** an authenticated organizer submits valid concert details
- **THEN** the system SHALL create a DRAFT concert owned by that organizer
- **AND** omitted `eventType` SHALL default to CONCERT

#### Scenario: Organizer updates an owned concert
- **WHEN** an organizer updates a concert they own with valid editable metadata, marketplace content, or slug
- **THEN** the system SHALL persist the changes and return the updated concert

#### Scenario: Organizer updates slug
- **WHEN** an organizer updates the slug of a concert they own to a valid unique URL-safe value
- **THEN** the system SHALL persist the new slug and return it in subsequent reads

#### Scenario: Organizer cannot update another organizer's concert
- **WHEN** an organizer attempts to update a concert owned by a different organizer
- **THEN** the system SHALL reject the request as forbidden

#### Scenario: Organizer publishes a draft concert
- **WHEN** an organizer requests to publish a DRAFT concert they own
- **THEN** the system SHALL transition it to PUBLISHED and record `publishedAt`

#### Scenario: Organizer cannot publish an already-published concert
- **WHEN** an organizer requests to publish a concert that is already PUBLISHED
- **THEN** the system SHALL reject the invalid status transition

#### Scenario: Organizer cancels a published concert
- **WHEN** an organizer cancels a published concert they own
- **THEN** the system SHALL transition it to CANCELLED and record `cancelledAt`

#### Scenario: Organizer list is ownership-scoped
- **WHEN** an organizer lists concerts
- **THEN** the system SHALL return only concerts whose `createdById` matches that organizer, including DRAFT, PUBLISHED, CANCELLED, and ENDED concerts, with management marketplace metadata

#### Scenario: Organizer detail is ownership-scoped
- **WHEN** an organizer requests a concert they own by id
- **THEN** the system SHALL return that concert regardless of status with management marketplace metadata

#### Scenario: Organizer read rejects another owner's concert
- **WHEN** an organizer requests a concert owned by another organizer
- **THEN** the system SHALL reject the request as forbidden

#### Scenario: Reading a non-existent concert returns not found
- **WHEN** an authenticated organizer requests `GET /organizer/concerts/:id` for an id that does not exist
- **THEN** the system SHALL respond with a not-found error

#### Scenario: Organizer cannot update concert to an invalid slug
- **WHEN** an organizer submits a slug that is not URL-safe while updating a concert
- **THEN** the system SHALL reject the update with a validation error

#### Scenario: Organizer cannot update concert to a duplicate slug
- **WHEN** an organizer submits a slug that already belongs to another concert
- **THEN** the system SHALL reject the update with a conflict error

#### Scenario: Organizer cancels a draft concert
- **WHEN** an organizer cancels a DRAFT concert they own
- **THEN** the system SHALL transition it to CANCELLED and record `cancelledAt`

#### Scenario: Organizer cannot cancel an already-cancelled concert
- **WHEN** an organizer attempts to cancel a concert already in CANCELLED status
- **THEN** the system SHALL reject the request with a status transition error

#### Scenario: Organizer cannot modify ended concert
- **WHEN** an organizer attempts to update, publish, cancel, replace artists, or upload a banner for a concert in ENDED status
- **THEN** the system SHALL reject the request

#### Scenario: Organizer cannot modify cancelled concert
- **WHEN** an organizer attempts to update, publish, replace artists, or upload a banner for a concert in CANCELLED status
- **THEN** the system SHALL reject the request

#### Scenario: Organizer cannot moderate featured placement
- **WHEN** an organizer submits `isFeatured` or `displayOrder`
- **THEN** strict validation SHALL reject the request without changing moderation state

#### Scenario: Organizer uploads seating map asset
- **WHEN** an organizer uploads a valid SVG seating map for a concert they manage
- **THEN** the system SHALL store the SVG as an asset and associate it with the concert as its seating map asset
