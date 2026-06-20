# concert-management Specification

## Purpose
TBD - created by archiving change define-ticketbox-blueprint. Update Purpose after archive.
## Requirements
### Requirement: Public concert catalog
The system SHALL show upcoming concerts with artist, venue, schedule, poster, seating map asset, seating zones, ticket types, prices, sale windows, ticket-to-zone mappings, and near-real-time availability.

#### Scenario: Audience views concert list
- **WHEN** an audience user opens the public concert list
- **THEN** the system SHALL return only upcoming published concerts with summary metadata ordered by start time

#### Scenario: Audience cannot see unpublished or unavailable concerts in public list
- **WHEN** the public concert list contains draft, cancelled, ended, or past concerts in the database
- **THEN** the system SHALL exclude those concerts from the public catalog response

#### Scenario: Audience views concert detail
- **WHEN** an audience user opens a published upcoming concert detail page
- **THEN** the system SHALL return concert detail, poster asset metadata, seating map asset metadata, seating zones with SVG element IDs, ticket types, ticket-to-zone mappings, and availability snapshots

#### Scenario: Audience cannot view non-public concert detail
- **WHEN** an audience user requests a draft, cancelled, ended, or past concert detail page
- **THEN** the system SHALL return a not-found response without exposing private administration data

#### Scenario: Audience selects a seating zone
- **WHEN** an audience user selects a rendered seating zone from the concert detail seating map
- **THEN** the system SHALL provide enough catalog data for the frontend to show the ticket types, prices, sale windows, and availability mapped to that zone

#### Scenario: Availability is calculated from persisted ticket quantities
- **WHEN** the public catalog returns a ticket type availability snapshot
- **THEN** the system SHALL calculate available quantity from persisted ticket type totals, reserved quantity, and sold quantity without creating reservations or orders

#### Scenario: Ticket type mapping stays within the same concert
- **WHEN** the public concert detail response includes ticket-to-zone mappings
- **THEN** every mapped ticket type and seating zone SHALL belong to the requested concert

### Requirement: Organizer concert administration
The system SHALL allow authorized organizers to create, update, publish, and cancel concerts, including assigning poster and seating map assets.

#### Scenario: Organizer creates concert
- **WHEN** an organizer submits valid concert information
- **THEN** the system SHALL create a draft concert associated with that organizer

#### Scenario: Organizer updates concert details
- **WHEN** an organizer submits updated information for a concert they own (DRAFT or PUBLISHED status)
- **THEN** the system SHALL apply the update and return the updated concert

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

### Requirement: Ticket type configuration
The system SHALL allow organizers to configure ticket type code, name, description, price, quantity, sale window, maximum quantity per user, status, and seating-zone mappings per concert.

#### Scenario: Organizer configures SVIP ticket type
- **WHEN** an organizer creates an SVIP ticket type with quantity 200 and max 2 per user
- **THEN** the system SHALL persist those constraints and use them during checkout

#### Scenario: Organizer configures custom ticket type
- **WHEN** an organizer creates a custom ticket type such as Diamond, Gold, Standing, or Couple for a concert
- **THEN** the system SHALL persist the ticket type for that concert without requiring the code or name to be one of SVIP, VIP, GA, CAT1, or CAT2

#### Scenario: Invalid ticket type is rejected — negative price
- **WHEN** an organizer submits a ticket type with a negative price
- **THEN** the system SHALL reject the configuration with a validation error identifying the price field

#### Scenario: Invalid ticket type is rejected — invalid quantity
- **WHEN** an organizer submits a ticket type with a zero or negative quantity
- **THEN** the system SHALL reject the configuration with a validation error identifying the quantity field

#### Scenario: Invalid ticket type is rejected — invalid sale window
- **WHEN** an organizer submits a ticket type where sale end time is not after sale start time
- **THEN** the system SHALL reject the configuration with a validation error identifying the sale window

#### Scenario: Duplicate ticket type code is rejected within a concert
- **WHEN** an organizer creates two ticket types with the same code for the same concert
- **THEN** the system SHALL reject the duplicate code with a conflict error

#### Scenario: Same ticket type code is allowed across concerts
- **WHEN** different concerts use the same ticket type code
- **THEN** the system SHALL allow the code because ticket type codes are unique only within each concert

#### Scenario: Organizer updates ticket type
- **WHEN** an organizer submits updated fields for a ticket type on a concert they own
- **THEN** the system SHALL apply the update; if the updated code conflicts with another ticket type code in the same concert the system SHALL reject with a conflict error

#### Scenario: Organizer archives ticket type
- **WHEN** an organizer archives a ticket type on a concert they own and no sold or reserved tickets exist for that type
- **THEN** the system SHALL set the ticket type status to ARCHIVED rather than removing the record, preserving order history

### Requirement: Seating map zone mapping
The system SHALL allow organizers to define seating zones from uploaded SVG element IDs and map ticket types to those zones.

#### Scenario: Organizer defines seating zones from SVG elements
- **WHEN** an organizer uploads a seating map SVG with identifiable element IDs for a concert
- **THEN** the system SHALL allow the organizer to save selected SVG element IDs as seating zones with labels, colors, display order, and status for that concert

#### Scenario: Unsafe seating map SVG is rejected
- **WHEN** an organizer uploads a seating map SVG containing scripts, event handlers, external references, unsupported content, or file size beyond the configured limit
- **THEN** the system SHALL reject the SVG before storing it as an active seating map asset

#### Scenario: Seating zone color falls back to default
- **WHEN** an organizer defines a seating zone without a custom color
- **THEN** the system SHALL allow the zone and provide enough data for the frontend to render it with a default color

#### Scenario: Organizer maps ticket type to multiple zones
- **WHEN** an organizer configures a ticket type that covers more than one seating area
- **THEN** the system SHALL allow that ticket type to be mapped to multiple seating zones from the same concert

#### Scenario: Organizer maps multiple ticket types to one zone
- **WHEN** an organizer offers multiple ticket types for the same seating area
- **THEN** the system SHALL allow multiple ticket types from the same concert to map to the same seating zone

#### Scenario: Cross-concert zone mapping is rejected
- **WHEN** an organizer attempts to map a ticket type from one concert to a seating zone from another concert
- **THEN** the system SHALL reject the mapping

### Requirement: Seating map SVG multipart upload
The system SHALL allow organizers and admins to upload a seating map SVG file for a concert via `multipart/form-data` using the field name `file`, validate the file for safety before storage, store it through the shared `ObjectStoragePort`, persist asset metadata, and associate it with the concert.

#### Scenario: Organizer uploads valid SVG seating map
- **WHEN** an organizer uploads a valid SVG file via `POST /organizer/concerts/:concertId/seating-map` with `multipart/form-data` for a concert they own
- **THEN** the system SHALL validate the SVG for safety, store the file via `ObjectStoragePort`, create an `Asset` record with kind `SEATING_MAP`, and update `concert.seatingMapAssetId` to the new asset

#### Scenario: Admin uploads seating map for any concert
- **WHEN** an admin uploads a valid SVG file via `POST /admin/concerts/:concertId/seating-map` with `multipart/form-data`
- **THEN** the system SHALL authorize the admin, validate the SVG, store the file, create the asset, and associate it with the concert regardless of ownership

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

#### Scenario: Unsafe SVG is rejected before storage
- **WHEN** a seating map SVG contains `<script>` tags, event handlers (`onclick`, `onload`, etc.), `javascript:` URLs, `<iframe>`, `<object>`, `<embed>`, `<foreignObject>`, external references (`xlink:href` or `href` pointing to external URLs), or `data:text/html` URIs
- **THEN** the system SHALL reject the SVG with a safety validation error before storing it

#### Scenario: Organizer cannot upload to non-owned concert
- **WHEN** an organizer attempts to upload a seating map for a concert they do not own via the organizer route
- **THEN** the system SHALL reject the request with a forbidden error

#### Scenario: Re-upload replaces previous seating map asset
- **WHEN** an organizer or admin uploads a new seating map for a concert that already has a seating map asset
- **THEN** the system SHALL store the new file, create a new asset record, update `concert.seatingMapAssetId`, and mark the old asset as archived

### Requirement: Seating map asset metadata persistence
The system SHALL persist seating map asset metadata in the `assets` table with sufficient information to serve public catalog responses and manage lifecycle.

#### Scenario: Asset record contains required metadata
- **WHEN** a seating map SVG is successfully uploaded and stored
- **THEN** the system SHALL create an `Asset` record with `kind` set to `SEATING_MAP`, `storageKey` following the convention `seating-maps/{concertId}/{assetId}.svg`, `publicUrl` built from `ObjectStoragePort.getPublicUrl(storageKey)`, `contentType` set to `image/svg+xml`, `sizeBytes` matching the file size, `checksum` as SHA-256 hash of the file content, `originalName` from the uploaded filename, and `uploadedById` as the authenticated user

### Requirement: Seating zone management
The system SHALL allow organizers and admins to create and update seating zones for a concert by specifying SVG element IDs, labels, optional colors, display order, and optional status.

#### Scenario: Seating zones are upserted with svgElementId
- **WHEN** an organizer or admin submits a list of seating zones with `svgElementId`, `label`, optional `color`, `displayOrder`, and optional `status` for a concert they are authorized to manage
- **THEN** the system SHALL upsert zones by `(concertId, svgElementId)` — creating new zones and updating existing ones

#### Scenario: Seating zone status defaults to active
- **WHEN** an organizer or admin upserts a seating zone without specifying `status`
- **THEN** the system SHALL persist the zone with status `ACTIVE`

#### Scenario: Duplicate svgElementId in same request is rejected
- **WHEN** a seating zone upsert request contains duplicate `svgElementId` values
- **THEN** the system SHALL reject the request with a validation error

#### Scenario: Zones not in request payload are preserved
- **WHEN** an upsert request contains only a subset of existing zones for a concert
- **THEN** the system SHALL NOT delete zones that are not included in the request — the operation is append/update only

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
