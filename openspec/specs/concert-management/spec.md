# concert-management Specification

## Purpose
TBD - created by archiving change define-ticketbox-blueprint. Update Purpose after archive.
## Requirements
### Requirement: Public concert catalog
The system SHALL show upcoming concerts with artist, venue, schedule, poster, seating map asset,
seating zones, ticket types, prices, sale windows, ticket-to-zone mappings, and availability.
Public catalog list and detail responses SHALL expose only upcoming published concerts. Public
detail responses SHALL compose current short-TTL availability into the returned response shape
before responding. Public list responses SHALL preserve their existing response shape, including
`availabilitySummary`, without requiring near-real-time availability freshness.

#### Scenario: Audience views concert list
- **WHEN** an audience user opens the public concert list
- **THEN** the system SHALL return only upcoming published concerts with summary metadata ordered by start time

#### Scenario: Audience concert list keeps availability summary shape
- **WHEN** an audience user opens the public concert list
- **THEN** each concert summary SHALL include `availabilitySummary`
- **AND** the system SHALL NOT require that summary to reflect the short-TTL availability window

#### Scenario: Audience cannot see unpublished or unavailable concerts in public list
- **WHEN** the public concert list contains draft, cancelled, ended, or past concerts in the database
- **THEN** the system SHALL exclude those concerts from the public catalog response

#### Scenario: Audience views concert detail
- **WHEN** an audience user opens a published upcoming concert detail page
- **THEN** the system SHALL return concert detail, poster asset metadata, seating map asset metadata, seating zones with SVG element IDs, ticket types, ticket-to-zone mappings, and availability snapshots

#### Scenario: Audience concert detail includes composed ticket availability
- **WHEN** an audience user opens a published upcoming concert detail page
- **THEN** each returned ticket type SHALL include `availableQuantity` composed from the current short-TTL availability data by ticket type id
- **AND** the detail response SHALL preserve the existing public response shape

#### Scenario: Missing availability item does not fail detail response
- **WHEN** a published concert detail response is composed and availability data is missing for one ticket type
- **THEN** the system SHALL return the detail response without failing
- **AND** the affected ticket type SHALL keep the static fallback availability value or another safe fallback value

#### Scenario: Audience cannot view non-public concert detail
- **WHEN** an audience user requests a draft, cancelled, ended, or past concert detail page
- **THEN** the system SHALL return a not-found response without exposing private administration data

#### Scenario: Audience cannot view non-public concert availability
- **WHEN** an audience user requests availability for a draft, cancelled, ended, or past concert slug
- **THEN** the system SHALL return a not-found response without exposing availability or private administration data

#### Scenario: Audience selects a seating zone
- **WHEN** an audience user selects a rendered seating zone from the concert detail seating map
- **THEN** the system SHALL provide enough catalog data for the frontend to show the ticket types, prices, sale windows, and availability mapped to that zone

#### Scenario: Availability is calculated from persisted ticket quantities
- **WHEN** the public catalog returns a ticket type availability snapshot
- **THEN** the system SHALL calculate available quantity from persisted ticket type totals, reserved quantity, and sold quantity without creating reservations or orders

#### Scenario: Ticket type mapping stays within the same concert
- **WHEN** the public concert detail response includes ticket-to-zone mappings
- **THEN** every mapped ticket type and seating zone SHALL belong to the requested concert

### Requirement: Public catalog asset URL contract
The system SHALL expose public catalog asset metadata for poster and seating map assets using URL
strings, not embedded binary content. The primary production delivery path SHALL be the asset
`publicUrl`; backend streaming through `GET /assets/:id` SHALL remain available only as a fallback,
debug, or development path.

#### Scenario: Public catalog response includes asset metadata
- **WHEN** a public concert list or detail response includes a poster or seating map asset
- **THEN** the asset metadata SHALL include at least `id`, `publicUrl`, `kind`, `status`, `originalName`, `contentType`, and `sizeBytes`
- **AND** the response SHALL NOT embed the binary image or SVG content in JSON

#### Scenario: Audience client can render production asset URL directly
- **WHEN** an audience client receives an asset with a non-empty `publicUrl`
- **THEN** the client contract SHALL treat that URL as the primary image or SVG source
- **AND** the client SHALL NOT need to call another API only to obtain an image URL

#### Scenario: Backend asset endpoint remains a fallback
- **WHEN** a client requests `GET /assets/:id` for an active servable poster or seating map asset
- **THEN** the system SHALL stream the asset bytes with the stored content type
- **AND** this endpoint SHALL NOT replace `publicUrl` as the primary production asset delivery path

#### Scenario: Poster upload persists public URL
- **WHEN** an organizer or admin uploads a valid poster image
- **THEN** the system SHALL store the object and persist the asset `publicUrl` returned by `ObjectStoragePort.getPublicUrl(storageKey)`

#### Scenario: Seating map upload persists public URL
- **WHEN** an organizer or admin uploads a valid seating map SVG
- **THEN** the system SHALL store the object and persist the asset `publicUrl` returned by `ObjectStoragePort.getPublicUrl(storageKey)`

### Requirement: Organizer concert administration

The system SHALL allow authorized organizers to list, read, create, update, publish, and cancel concerts, including assigning poster and seating map assets. Read endpoints scoped to the organizer SHALL include concerts in every status (DRAFT, PUBLISHED, CANCELLED, ENDED), unlike the public catalog which only exposes published, available concerts. Concert slug SHALL be editable through the update endpoint and use the same URL-safe validation as creation.

#### Scenario: Organizer lists their concerts across all statuses

- **WHEN** an authenticated organizer requests `GET /organizer/concerts`
- **THEN** the system SHALL return the concerts created by that organizer, including DRAFT, PUBLISHED, CANCELLED, and ENDED concerts

#### Scenario: Organizer concert list excludes other organizers' concerts

- **WHEN** an authenticated organizer requests `GET /organizer/concerts`
- **THEN** the system SHALL NOT include concerts owned by a different organizer

#### Scenario: Organizer reads a single concert they own

- **WHEN** an authenticated organizer requests `GET /organizer/concerts/:id` for a concert they own
- **THEN** the system SHALL return that concert regardless of its status

#### Scenario: Organizer cannot read a concert they do not own

- **WHEN** an authenticated organizer requests `GET /organizer/concerts/:id` for a concert owned by another organizer
- **THEN** the system SHALL reject the request as forbidden

#### Scenario: Reading a non-existent concert returns not found

- **WHEN** an authenticated organizer requests `GET /organizer/concerts/:id` for an id that does not exist
- **THEN** the system SHALL respond with a not-found error

#### Scenario: Organizer creates concert

- **WHEN** an organizer submits valid concert information
- **THEN** the system SHALL create a draft concert associated with that organizer

#### Scenario: Organizer updates concert details

- **WHEN** an organizer submits updated information, including slug when changed, for a concert they own (DRAFT or PUBLISHED status)
- **THEN** the system SHALL apply the update and return the updated concert

#### Scenario: Organizer cannot update concert to an invalid slug

- **WHEN** an organizer submits a slug that is not URL-safe while updating a concert
- **THEN** the system SHALL reject the update with a validation error

#### Scenario: Organizer cannot update concert to a duplicate slug

- **WHEN** an organizer submits a slug that already belongs to another concert
- **THEN** the system SHALL reject the update with a conflict error

#### Scenario: Organizer publishes a draft concert

- **WHEN** an organizer requests to publish a draft concert they own
- **THEN** the system SHALL transition the concert status from DRAFT to PUBLISHED

#### Scenario: Organizer cannot publish an already-published concert

- **WHEN** an organizer requests to publish a concert that is already PUBLISHED
- **THEN** the system SHALL reject the request with a status transition error

#### Scenario: Organizer cancels a published concert

- **WHEN** an organizer cancels a published concert they own
- **THEN** the system SHALL mark the concert as CANCELLED and prevent new ticket purchases

#### Scenario: Organizer cancels a draft concert

- **WHEN** an organizer cancels a draft concert they own
- **THEN** the system SHALL mark the concert as CANCELLED

#### Scenario: Organizer cannot cancel an already-cancelled concert

- **WHEN** an organizer attempts to cancel a concert already in CANCELLED status
- **THEN** the system SHALL reject the request with a status transition error

#### Scenario: Organizer cannot modify an ENDED concert

- **WHEN** an organizer attempts to update, publish, or cancel a concert in ENDED status
- **THEN** the system SHALL reject the request with a status transition error

#### Scenario: Organizer uploads seating map asset

- **WHEN** an organizer uploads a valid SVG seating map for a concert they manage
- **THEN** the system SHALL store the SVG as an asset and associate it with the concert as its seating map asset

### Requirement: Admin concert administration

The system SHALL allow authorized admins to list, read, and edit all concerts and to moderate them by publishing or cancelling, through admin endpoints. Admin read endpoints SHALL include all concerts in every status (DRAFT, PUBLISHED, CANCELLED, ENDED), regardless of owner. Admins SHALL NOT create concerts; concert creation is reserved for organizers.

#### Scenario: Admin lists all concerts across all statuses

- **WHEN** an authenticated admin requests `GET /admin/concerts`
- **THEN** the system SHALL return all concerts, including DRAFT, PUBLISHED, CANCELLED, and ENDED concerts

#### Scenario: Admin reads any concert

- **WHEN** an authenticated admin requests `GET /admin/concerts/:id` for an existing concert
- **THEN** the system SHALL return that concert regardless of owner or status

#### Scenario: Admin reading a non-existent concert returns not found

- **WHEN** an authenticated admin requests `GET /admin/concerts/:id` for an id that does not exist
- **THEN** the system SHALL respond with a not-found error

#### Scenario: Admin edits a concert

- **WHEN** an authenticated admin submits updated concert metadata (including slug when changed) via the admin update endpoint
- **THEN** the system SHALL apply the update and return the updated concert

#### Scenario: Admin publishes a draft concert

- **WHEN** an authenticated admin publishes a DRAFT concert through the admin endpoint
- **THEN** the system SHALL transition the concert status from DRAFT to PUBLISHED

#### Scenario: Admin cancels a concert

- **WHEN** an authenticated admin cancels a concert through the admin endpoint
- **THEN** the system SHALL mark the concert as CANCELLED

### Requirement: Ticket type configuration
The system SHALL allow organizers and admins to configure ticket type code, name, description, price, quantity,
sale window, maximum quantity per user, status, and seating-zone mappings per concert. Ticket-type
validation SHALL preserve domain-level validation errors inside application use-cases and SHALL map
those errors to HTTP validation or conflict responses at the HTTP adapter boundary.

#### Scenario: Organizer configures SVIP ticket type
- **WHEN** an organizer creates an SVIP ticket type with quantity 200 and max 2 per user
- **THEN** the system SHALL persist those constraints and use them during checkout

#### Scenario: Admin configures ticket type
- **WHEN** an admin creates or updates a ticket type for any concert
- **THEN** the system SHALL persist the ticket type using the same validation rules as organizer ticket-type configuration

#### Scenario: Organizer configures custom ticket type
- **WHEN** an organizer creates a custom ticket type such as Diamond, Gold, Standing, or Couple for a concert
- **THEN** the system SHALL persist the ticket type for that concert without requiring the code or name to be one of SVIP, VIP, GA, CAT1, or CAT2

#### Scenario: Invalid ticket type is rejected — negative price
- **WHEN** an organizer or admin submits a ticket type with a negative price
- **THEN** the system SHALL reject the configuration with a validation error identifying the price field

#### Scenario: Invalid ticket type is rejected — invalid quantity
- **WHEN** an organizer or admin submits a ticket type with a zero or negative quantity
- **THEN** the system SHALL reject the configuration with a validation error identifying the quantity field

#### Scenario: Invalid ticket type is rejected — invalid sale window
- **WHEN** an organizer or admin submits a ticket type where sale end time is not after sale start time
- **THEN** the system SHALL reject the configuration with a validation error identifying the sale window

#### Scenario: Duplicate ticket type code is rejected within a concert
- **WHEN** an organizer or admin creates two ticket types with the same code for the same concert
- **THEN** the system SHALL reject the duplicate code with a conflict error

#### Scenario: Same ticket type code is allowed across concerts
- **WHEN** different concerts use the same ticket type code
- **THEN** the system SHALL allow the code because ticket type codes are unique only within each concert

#### Scenario: Organizer updates ticket type
- **WHEN** an organizer submits updated fields for a ticket type on a concert they own
- **THEN** the system SHALL apply the update; if the updated code conflicts with another ticket type code in the same concert the system SHALL reject with a conflict error

#### Scenario: Admin updates ticket type
- **WHEN** an admin submits updated fields for a ticket type on any concert
- **THEN** the system SHALL apply the update; if the updated code conflicts with another ticket type code in the same concert the system SHALL reject with a conflict error

#### Scenario: Organizer archives ticket type
- **WHEN** an organizer archives a ticket type on a concert they own and no sold or reserved tickets exist for that type
- **THEN** the system SHALL set the ticket type status to ARCHIVED rather than removing the record, preserving order history

#### Scenario: Admin archives ticket type
- **WHEN** an admin archives a ticket type on any concert and no sold or reserved tickets exist for that type
- **THEN** the system SHALL set the ticket type status to ARCHIVED rather than removing the record, preserving order history

#### Scenario: Application use-case exposes domain validation errors
- **WHEN** a ticket-type application use-case rejects invalid price, invalid quantity, invalid sale
  period, duplicate code, or archive-with-sold-or-reserved-quantity input
- **THEN** the application layer SHALL expose the corresponding domain error without converting it
  to a Nest HTTP exception

#### Scenario: HTTP adapter maps ticket-type domain errors
- **WHEN** a protected ticket-type HTTP endpoint receives input that the application layer rejects
  with a ticket-type domain validation or conflict error
- **THEN** the HTTP adapter SHALL map the domain error to the appropriate validation or conflict
  HTTP response

### Requirement: Seating map zone mapping
The system SHALL allow organizers and admins to define seating zones from uploaded SVG element IDs and map ticket types to those zones.

#### Scenario: Organizer defines seating zones from SVG elements
- **WHEN** an organizer uploads a seating map SVG with identifiable element IDs for a concert they own
- **THEN** the system SHALL allow the organizer to save selected SVG element IDs as seating zones with labels, colors, display order, and status for that concert

#### Scenario: Admin defines seating zones from SVG elements
- **WHEN** an admin uploads a seating map SVG with identifiable element IDs for any concert
- **THEN** the system SHALL allow the admin to save selected SVG element IDs as seating zones with labels, colors, display order, and status for that concert

#### Scenario: Unsafe seating map SVG is rejected
- **WHEN** an organizer or admin uploads a seating map SVG containing scripts, event handlers, external references, unsupported content, or file size beyond the configured limit
- **THEN** the system SHALL reject the SVG before storing it as an active seating map asset

#### Scenario: Seating zone color falls back to default
- **WHEN** an organizer or admin defines a seating zone without a custom color
- **THEN** the system SHALL allow the zone and provide enough data for the frontend to render it with a default color

#### Scenario: Organizer maps ticket type to multiple zones
- **WHEN** an organizer configures a ticket type that covers more than one seating area
- **THEN** the system SHALL allow that ticket type to be mapped to multiple seating zones from the same concert

#### Scenario: Admin maps ticket type to multiple zones
- **WHEN** an admin configures a ticket type that covers more than one seating area
- **THEN** the system SHALL allow that ticket type to be mapped to multiple seating zones from the same concert

#### Scenario: Organizer maps multiple ticket types to one zone
- **WHEN** an organizer offers multiple ticket types for the same seating area
- **THEN** the system SHALL allow multiple ticket types from the same concert to map to the same seating zone

#### Scenario: Admin maps multiple ticket types to one zone
- **WHEN** an admin offers multiple ticket types for the same seating area
- **THEN** the system SHALL allow multiple ticket types from the same concert to map to the same seating zone

#### Scenario: Cross-concert zone mapping is rejected
- **WHEN** an organizer or admin attempts to map a ticket type from one concert to a seating zone from another concert
- **THEN** the system SHALL reject the mapping

### Requirement: Poster image multipart upload
The system SHALL allow organizers and admins to upload a raster poster image for a concert via `multipart/form-data` using the field name `file`, validate the file before storage, store it through the shared `ObjectStoragePort`, persist asset metadata, and associate it with the concert.

#### Scenario: Organizer uploads valid poster image
- **WHEN** an organizer uploads a valid PNG, JPEG, or WebP poster via `POST /organizer/concerts/:concertId/poster` with `multipart/form-data` for a concert they own
- **THEN** the system SHALL validate the image, store the file via `ObjectStoragePort`, create an `Asset` record with kind `POSTER`, and update `concert.posterAssetId` to the new asset

#### Scenario: Admin uploads poster for any concert
- **WHEN** an admin uploads a valid PNG, JPEG, or WebP poster via `POST /admin/concerts/:concertId/poster` with `multipart/form-data`
- **THEN** the system SHALL authorize the admin, validate the image, store the file, create the poster asset, and associate it with the concert regardless of ownership

#### Scenario: Missing file is rejected
- **WHEN** a request to upload a poster is sent without a file
- **THEN** the system SHALL reject the request with a validation error before storing an object or creating an asset

#### Scenario: Organizer cannot upload to non-owned concert
- **WHEN** an organizer attempts to upload a poster for a concert they do not own via the organizer route
- **THEN** the system SHALL reject the request with a forbidden error

#### Scenario: Re-upload replaces and deletes previous poster asset
- **WHEN** an organizer or admin uploads a new valid poster for a concert that already has a poster asset
- **THEN** the system SHALL store the new file, create a new asset record, update `concert.posterAssetId`, delete the previous poster `Asset` record within the same transaction, and delete the previous poster's stored object from `ObjectStoragePort` after the transaction commits

#### Scenario: Stored-object cleanup failure does not fail the upload
- **WHEN** the new poster has been persisted and `concert.posterAssetId` updated, but deleting the previous poster's stored object from `ObjectStoragePort` fails
- **THEN** the system SHALL still return the upload as successful and SHALL NOT roll back the new poster asset

### Requirement: Poster image validation
The system SHALL only accept raster poster uploads whose declared content type, filename extension, size, and magic bytes match an allowed poster image format.

#### Scenario: PNG poster is accepted
- **WHEN** a poster upload has content type `image/png`, a `.png` filename extension, and PNG magic bytes
- **THEN** the system SHALL accept the file type validation

#### Scenario: JPEG poster is accepted
- **WHEN** a poster upload has content type `image/jpeg` or `image/jpg`, a `.jpg` or `.jpeg` filename extension, and JPEG magic bytes
- **THEN** the system SHALL accept the file type validation and persist the asset `contentType` as `image/jpeg`

#### Scenario: WebP poster is accepted
- **WHEN** a poster upload has content type `image/webp`, a `.webp` filename extension, and WebP magic bytes
- **THEN** the system SHALL accept the file type validation

#### Scenario: Unsupported content type is rejected
- **WHEN** a poster upload has a content type other than `image/png`, `image/jpeg`, `image/jpg`, or `image/webp`
- **THEN** the system SHALL reject the upload with a validation error before storing an object or creating an asset

#### Scenario: Extension mismatch is rejected
- **WHEN** a poster upload filename extension does not match the declared allowed content type
- **THEN** the system SHALL reject the upload with a validation error before storing an object or creating an asset

#### Scenario: Spoofed image is rejected
- **WHEN** a poster upload declares an allowed content type and extension but its magic bytes do not match that format
- **THEN** the system SHALL reject the upload with a validation error before storing an object or creating an asset

#### Scenario: SVG poster is rejected
- **WHEN** a poster upload is submitted as `image/svg+xml` or with a `.svg` filename extension
- **THEN** the system SHALL reject the upload because posters MUST be raster images

#### Scenario: Oversized poster is rejected
- **WHEN** a poster upload exceeds `POSTER_IMAGE_MAX_BYTES`
- **THEN** the system SHALL reject the upload with a size validation error before creating an asset

### Requirement: Poster asset metadata persistence
The system SHALL persist poster asset metadata in the `assets` table with sufficient information to serve public catalog responses and manage lifecycle.

#### Scenario: Poster asset contains required metadata
- **WHEN** a poster image is successfully uploaded and stored
- **THEN** the system SHALL create an `Asset` record with `kind` set to `POSTER`, `status` set to `ACTIVE`, `storageKey` following the convention `posters/{concertId}/{assetId}.{ext}`, `publicUrl` built from `ObjectStoragePort.getPublicUrl(storageKey)`, `contentType` set to the validated image content type, `sizeBytes` matching the file size, `checksum` as SHA-256 hash of the file content, `originalName` from the uploaded filename, and `uploadedById` as the authenticated user

#### Scenario: Persistence failure cleans up uploaded object
- **WHEN** the poster object is uploaded successfully but database asset creation or concert association fails
- **THEN** the system SHALL best-effort delete the newly uploaded object and SHALL NOT leave `concert.posterAssetId` pointing to a missing asset

### Requirement: Poster max size configuration
The system SHALL provide a configurable environment variable `POSTER_IMAGE_MAX_BYTES` to control the maximum allowed file size for poster image uploads.

#### Scenario: Default poster max size is applied when not configured
- **WHEN** `POSTER_IMAGE_MAX_BYTES` is not set in the environment
- **THEN** the system SHALL apply a default maximum size of 5 MB (5242880 bytes) for poster image uploads

#### Scenario: Configured poster max size is applied
- **WHEN** `POSTER_IMAGE_MAX_BYTES` is set in the environment
- **THEN** the system SHALL use that value for both HTTP upload limits and application-level poster size validation

### Requirement: Public catalog reflects uploaded poster
The system SHALL expose uploaded poster metadata through existing public concert detail responses that already include the concert poster asset relation.

#### Scenario: Public detail returns uploaded poster metadata
- **WHEN** an audience user opens the public detail page for a published concert after a poster has been uploaded
- **THEN** the system SHALL return the associated poster asset metadata in the existing `posterAsset` field without requiring a new public endpoint

### Requirement: Seating map SVG multipart upload
The system SHALL allow organizers and admins to upload a seating map SVG file for a DRAFT concert via `multipart/form-data` using the field name `file`, sanitize the file using an allowlist approach before storage, extract element IDs into asset metadata, store it through the shared `ObjectStoragePort`, persist asset metadata, and associate it with the concert. When replacing an existing seating map, the system SHALL delete all seating zones for that concert within the same transaction.

#### Scenario: Organizer uploads valid SVG seating map
- **WHEN** an organizer uploads a valid SVG file via `POST /organizer/concerts/:concertId/seating-map` with `multipart/form-data` for a DRAFT concert they own
- **THEN** the system SHALL sanitize the SVG using an allowlist, extract element IDs into `Asset.metadata.svgElementIds`, store the sanitized file via `ObjectStoragePort`, create an `Asset` record with kind `SEATING_MAP`, and update `concert.seatingMapAssetId` to the new asset

#### Scenario: Admin uploads seating map for any concert
- **WHEN** an admin uploads a valid SVG file via `POST /admin/concerts/:concertId/seating-map` with `multipart/form-data` for a DRAFT concert
- **THEN** the system SHALL authorize the admin, sanitize the SVG, extract element IDs, store the file, create the asset, and associate it with the concert regardless of ownership

#### Scenario: Missing file is rejected
- **WHEN** a request to upload a seating map is sent without a file
- **THEN** the system SHALL reject the request with a validation error

#### Scenario: Non-SVG content type is rejected
- **WHEN** a file with a content type other than `image/svg+xml` is uploaded as a seating map
- **THEN** the system SHALL reject the upload with a validation error before storing

#### Scenario: Non-SVG file extension is rejected
- **WHEN** a file without the `.svg` extension is uploaded as a seating map
- **THEN** the system SHALL reject the upload with a validation error before storing

#### Scenario: Oversized SVG is rejected
- **WHEN** a file exceeding `SEATING_MAP_SVG_MAX_BYTES` is uploaded as a seating map
- **THEN** the system SHALL reject the upload with a size limit error before storing

#### Scenario: Unsafe SVG content is stripped before storage
- **WHEN** a seating map SVG contains `<script>` tags, event handlers, `javascript:` URLs, `<iframe>`, `<object>`, `<embed>`, `<foreignObject>`, external references, or `data:text/html` URIs
- **THEN** the system SHALL strip the unsafe content using an allowlist sanitizer and store the sanitized version

#### Scenario: Organizer cannot upload to non-owned concert
- **WHEN** an organizer attempts to upload a seating map for a concert they do not own via the organizer route
- **THEN** the system SHALL reject the request with a forbidden error

#### Scenario: Re-upload replaces asset and resets zones
- **WHEN** an organizer uploads a new valid SVG seating map for a concert that already has a seating map asset and seating zones
- **THEN** the system SHALL store the new file, create a new asset record, update `concert.seatingMapAssetId`, delete the previous seating map `Asset` record, delete all `SeatingZone` rows for the concert (with `TicketTypeZone` cascade-deleted automatically), all within the same transaction, and delete the previous seating map's stored object from `ObjectStoragePort` after the transaction commits

#### Scenario: Stored-object cleanup failure does not fail the seating map upload
- **WHEN** the new seating map has been persisted and `concert.seatingMapAssetId` updated, but deleting the previous seating map's stored object from `ObjectStoragePort` fails
- **THEN** the system SHALL still return the upload as successful and SHALL NOT roll back the new seating map asset

#### Scenario: Upload is rejected for non-DRAFT concert
- **WHEN** an organizer or admin attempts to upload a seating map SVG for a concert in PUBLISHED, CANCELLED, or ENDED status
- **THEN** the system SHALL reject the request with an error indicating that seating map upload is only allowed for draft concerts

### Requirement: Seating map asset metadata persistence
The system SHALL persist seating map asset metadata in the `assets` table with sufficient information to serve public catalog responses and manage lifecycle.

#### Scenario: Asset record contains required metadata
- **WHEN** a seating map SVG is successfully uploaded and stored
- **THEN** the system SHALL create an `Asset` record with `kind` set to `SEATING_MAP`, `storageKey` following the convention `seating-maps/{concertId}/{assetId}.svg`, `publicUrl` built from `ObjectStoragePort.getPublicUrl(storageKey)`, `contentType` set to `image/svg+xml`, `sizeBytes` matching the file size, `checksum` as SHA-256 hash of the file content, `originalName` from the uploaded filename, and `uploadedById` as the authenticated user

### Requirement: Seating zone management
The system SHALL allow organizers and admins to create and update seating zones for a concert by specifying SVG element IDs, labels, optional colors, display order, and optional status. The concert MUST be in DRAFT status and MUST have an uploaded seating map SVG. Every submitted `svgElementId` MUST exist in the uploaded SVG's extracted element ID set.

#### Scenario: Seating zones are upserted with svgElementId
- **WHEN** an organizer or admin submits a list of seating zones with `svgElementId`, `label`, optional `color`, `displayOrder`, and optional `status` for a DRAFT concert they are authorized to manage that has an uploaded seating map
- **THEN** the system SHALL validate all `svgElementId` values against the SVG's extracted element IDs, and upsert zones by `(concertId, svgElementId)` — creating new zones and updating existing ones

#### Scenario: Seating zone status defaults to active
- **WHEN** an organizer or admin upserts a seating zone without specifying `status`
- **THEN** the system SHALL persist the zone with status `ACTIVE`

#### Scenario: Duplicate svgElementId in same request is rejected
- **WHEN** a seating zone upsert request contains duplicate `svgElementId` values
- **THEN** the system SHALL reject the request with a validation error

#### Scenario: Zones not in request payload are preserved
- **WHEN** an upsert request contains only a subset of existing zones for a concert
- **THEN** the system SHALL NOT delete zones that are not included in the request — the operation is append/update only

#### Scenario: Zone upsert uses PATCH method
- **WHEN** an organizer or admin submits a zone upsert request
- **THEN** the system SHALL accept the request via `PATCH` HTTP method on the seating-zones endpoint, not `PUT`

### Requirement: Ticket type to seating zone mapping
The system SHALL allow organizers and admins to map ticket types to seating zones within the same concert, supporting many-to-many relationships.

#### Scenario: Ticket type maps to one or many zones
- **WHEN** an organizer sets zone mappings for a ticket type with one or more seating zone IDs from the same concert
- **THEN** the system SHALL replace existing mappings and persist the new set of zone mappings

#### Scenario: Zone maps to one or many ticket types
- **WHEN** multiple ticket types from the same concert are each mapped to the same seating zone
- **THEN** the system SHALL persist all mappings without conflict

#### Scenario: Cross-concert mapping is rejected
- **WHEN** an organizer or admin attempts to map a ticket type to a seating zone that belongs to a different concert
- **THEN** the system SHALL reject the mapping with a validation error

#### Scenario: Empty zone list clears mappings
- **WHEN** an organizer sets zone mappings for a ticket type with an empty list of seating zone IDs
- **THEN** the system SHALL remove all existing zone mappings for that ticket type

### Requirement: Public catalog reflects seating map data
The system SHALL include seating map asset metadata, active seating zones, and ticket-type-to-active-zone mappings in public concert detail responses after upload.

#### Scenario: Public catalog detail returns seating map metadata and mappings
- **WHEN** an audience user opens the public detail page for a published concert that has a seating map asset, seating zones, and ticket-type-to-zone mappings
- **THEN** the system SHALL return the seating map asset metadata, all active seating zones with `svgElementId`, and ticket-type-to-zone mappings only for active seating zones in the concert detail response

### Requirement: Seating map SVG max size configuration
The system SHALL provide a configurable environment variable `SEATING_MAP_SVG_MAX_BYTES` to control the maximum allowed file size for seating map SVG uploads.

#### Scenario: Default max size is applied when not configured
- **WHEN** `SEATING_MAP_SVG_MAX_BYTES` is not set in the environment
- **THEN** the system SHALL apply a default maximum size of 5 MB (5242880 bytes) for seating map SVG uploads

### Requirement: Concert administration ownership enforcement
The system SHALL require organizer ownership or explicit admin authorization for protected concert administration actions, including concert details, ticket types, seating assets, revenue views, and check-in staff assignment management for the concert. Ownership is enforced by reusing the existing `AuthorizeConcertManagementUseCase` from the identity module, which checks `concert.createdById` against the authenticated user and supports `allowAdminOverride` for admin routes.

#### Scenario: Owner updates concert administration data
- **WHEN** an authenticated organizer updates administration data for a concert they created
- **THEN** the system SHALL authorize the action before applying validation and persistence

#### Scenario: Non-owner organizer cannot update concert administration data
- **WHEN** an authenticated organizer updates administration data for a concert created by another organizer
- **THEN** the system SHALL reject the request with an authorization error

#### Scenario: Admin can administer any concert through admin route
- **WHEN** an authenticated admin updates administration data for any concert through an admin-authorized route
- **THEN** the system SHALL authorize the action before applying validation and persistence

#### Scenario: Unauthenticated request is rejected on protected routes
- **WHEN** an unauthenticated request is sent to any organizer or admin concert administration route
- **THEN** the system SHALL return an unauthorized error without processing the request

### Requirement: Public concert detail published artist bio
The system SHALL include an approved artist bio on the public concert detail response only after organizer publication.

#### Scenario: Published artist bio is returned on public concert detail
- **WHEN** an audience user opens the public detail page for a published upcoming concert that has an approved artist bio
- **THEN** the system SHALL include the published artist bio text in the concert detail response

#### Scenario: Unapproved generated artist bio is hidden from public concert detail
- **WHEN** an audience user opens the public detail page for a concert whose latest artist bio job is draft, processing, failed, or ready for review
- **THEN** the system SHALL NOT include that unapproved generated bio, processing state, or error details in the public concert detail response

#### Scenario: Concert detail still works without artist bio
- **WHEN** an audience user opens the public detail page for a concert without a published artist bio
- **THEN** the system SHALL return the normal concert detail response with the artist bio field omitted or set to null

### Requirement: Public concert asset serving by id
The system SHALL expose a public endpoint `GET /assets/:id` that streams the binary content of an active concert poster or seating-map asset, resolving the asset by id and fetching its bytes from the shared `ObjectStoragePort`.

#### Scenario: Active poster asset is served
- **WHEN** a client requests `GET /assets/:id` for an existing `ACTIVE` asset whose kind is `POSTER`
- **THEN** the system SHALL stream the asset bytes from `ObjectStoragePort` with the `Content-Type` set to the asset's stored content type

#### Scenario: Active seating-map asset is served
- **WHEN** a client requests `GET /assets/:id` for an existing `ACTIVE` asset whose kind is `SEATING_MAP`
- **THEN** the system SHALL stream the asset bytes from `ObjectStoragePort` with the `Content-Type` set to the asset's stored content type

#### Scenario: No authentication is required
- **WHEN** an unauthenticated client requests `GET /assets/:id` for a servable asset
- **THEN** the system SHALL serve the asset bytes without requiring a JWT or any role

#### Scenario: Response is cacheable
- **WHEN** the system serves a servable asset
- **THEN** the response SHALL include a `Cache-Control` header marking the content as publicly cacheable, because an asset id maps to immutable content

### Requirement: Concert asset serving scope and not-found handling
The system SHALL only serve assets whose kind is `POSTER` or `SEATING_MAP` and SHALL return a `404` response for any request that cannot be served, without revealing whether an id exists.

#### Scenario: Unknown asset id returns 404
- **WHEN** a client requests `GET /assets/:id` for an id that has no matching `Asset` row
- **THEN** the system SHALL respond with `404`

#### Scenario: Archived asset returns 404
- **WHEN** a client requests `GET /assets/:id` for an asset whose status is `ARCHIVED`
- **THEN** the system SHALL respond with `404` and SHALL NOT stream any bytes

#### Scenario: Out-of-scope asset kind returns 404
- **WHEN** a client requests `GET /assets/:id` for an existing asset whose kind is neither `POSTER` nor `SEATING_MAP`
- **THEN** the system SHALL respond with `404` and SHALL NOT stream any bytes

#### Scenario: Missing storage object returns 404
- **WHEN** a servable asset row exists but its underlying object is missing from `ObjectStoragePort`
- **THEN** the system SHALL respond with `404`

### Requirement: Seating map authoring read endpoints
The system SHALL expose read-only protected admin and organizer endpoints for loading seating-map authoring state without changing existing write behavior. Admin endpoints SHALL allow reads for any concert. Organizer endpoints SHALL allow reads only for concerts owned by the organizer.

#### Scenario: Admin reads seating map metadata
- **WHEN** an authenticated admin requests `GET /admin/concerts/:id/seating-map` for an existing concert
- **THEN** the system SHALL return the current seating map `assetId` and extracted `svgElementIds`

#### Scenario: Organizer reads owned seating map metadata
- **WHEN** an authenticated organizer requests `GET /organizer/concerts/:id/seating-map` for a concert they own
- **THEN** the system SHALL return the current seating map `assetId` and extracted `svgElementIds`

#### Scenario: Missing seating map returns empty metadata
- **WHEN** an authorized admin or organizer reads seating map metadata for a concert without an uploaded seating map
- **THEN** the system SHALL return a safe empty authoring response with no `assetId` and an empty `svgElementIds` list

#### Scenario: Admin reads seating zones
- **WHEN** an authenticated admin requests `GET /admin/concerts/:id/seating-zones` for an existing concert
- **THEN** the system SHALL return that concert's seating zones with `id`, `svgElementId`, `label`, `color`, `displayOrder`, and `status`

#### Scenario: Organizer reads owned seating zones
- **WHEN** an authenticated organizer requests `GET /organizer/concerts/:id/seating-zones` for a concert they own
- **THEN** the system SHALL return that concert's seating zones with `id`, `svgElementId`, `label`, `color`, `displayOrder`, and `status`

#### Scenario: Admin reads ticket types with mapped zones
- **WHEN** an authenticated admin requests `GET /admin/concerts/:id/ticket-types` for an existing concert
- **THEN** the system SHALL return that concert's ticket types with code, name, description, `priceVnd`, total quantity, sale window, max per user, status, and `mappedZones`

#### Scenario: Organizer reads owned ticket types with mapped zones
- **WHEN** an authenticated organizer requests `GET /organizer/concerts/:id/ticket-types` for a concert they own
- **THEN** the system SHALL return that concert's ticket types with code, name, description, `priceVnd`, total quantity, sale window, max per user, status, and `mappedZones`

#### Scenario: Organizer cannot read another organizer's authoring state
- **WHEN** an authenticated organizer requests any seating-map authoring read endpoint for a concert owned by another organizer
- **THEN** the system SHALL reject the request as forbidden

#### Scenario: Non-existent concert authoring read returns not found
- **WHEN** an authenticated admin or organizer requests any seating-map authoring read endpoint for a concert id that does not exist
- **THEN** the system SHALL respond with a not-found error
## ADDED Requirements

### Requirement: Standardized Status Badge Colors
The system SHALL use standardized colors for concert status badges across all views: DRAFT (Amber), PUBLISHED (Purple), CANCELLED (Red), ENDED (Gray).

#### Scenario: User views a list of concerts
- **WHEN** concerts are displayed with their status
- **THEN** the badge color matches the standardized palette based on the specific status.

### Requirement: Public concert responses include linked artists
The system SHALL include an optional `artists` array in public concert list and detail responses, containing summary data for each artist linked to the concert via `ConcertArtist`, ordered by `displayOrder`.

#### Scenario: Public concert detail includes linked artists
- **WHEN** an audience user opens the public detail page for a published upcoming concert that has linked artists
- **THEN** the system SHALL include an `artists` array in the response, where each item contains the artist's `id`, `slug`, `displayName`, and `avatarAsset` metadata, ordered by `displayOrder`

#### Scenario: Public concert detail with no linked artists returns empty array
- **WHEN** an audience user opens the public detail page for a published upcoming concert that has no linked artists
- **THEN** the system SHALL include an empty `artists` array in the response

#### Scenario: Public concert list includes linked artists
- **WHEN** an audience user opens the public concert list
- **THEN** each concert summary SHALL include an `artists` array containing linked artist summaries ordered by `displayOrder`

#### Scenario: Inactive artists are excluded from public concert responses
- **WHEN** a concert is linked to an artist with status INACTIVE
- **THEN** the public concert response SHALL exclude that artist from the `artists` array

#### Scenario: Existing artistName field remains unchanged
- **WHEN** a public concert response includes linked artists in the `artists` array
- **THEN** the response SHALL continue to include the existing `artistName` string field with its original value

### Requirement: Concert artist linking management endpoints
The system SHALL allow organizers and admins to set the list of artists linked to a concert through protected endpoints, using replace semantics. Organizer endpoints SHALL enforce ownership. Admin endpoints SHALL allow any concert.

#### Scenario: Organizer sets artist list for owned concert
- **WHEN** an authenticated organizer submits `PUT /organizer/concerts/:id/artists` with a list of artist IDs and display orders for a concert they own
- **THEN** the system SHALL replace all existing `ConcertArtist` records for that concert with the submitted list

#### Scenario: Admin sets artist list for any concert
- **WHEN** an authenticated admin submits `PUT /admin/concerts/:id/artists` with a list of artist IDs and display orders
- **THEN** the system SHALL replace all existing `ConcertArtist` records for that concert with the submitted list regardless of ownership

#### Scenario: Organizer cannot set artists for non-owned concert
- **WHEN** an authenticated organizer submits `PUT /organizer/concerts/:id/artists` for a concert they do not own
- **THEN** the system SHALL reject the request with a forbidden error

#### Scenario: Empty artist list clears all concert artists
- **WHEN** an authorized user submits an empty artist list via the concert artist linking endpoint
- **THEN** the system SHALL remove all `ConcertArtist` records for that concert without affecting `Concert.artistName`

#### Scenario: Non-existent artist ID in list is rejected
- **WHEN** an authorized user submits an artist list containing an artist ID that does not exist in the database
- **THEN** the system SHALL reject the entire request with a validation error without partial application
