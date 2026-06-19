## ADDED Requirements

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
