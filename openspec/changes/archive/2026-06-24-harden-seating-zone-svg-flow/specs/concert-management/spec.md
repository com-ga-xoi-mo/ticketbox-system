## MODIFIED Requirements

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
