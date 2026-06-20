## ADDED Requirements

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

#### Scenario: Re-upload replaces previous poster asset
- **WHEN** an organizer or admin uploads a new valid poster for a concert that already has a poster asset
- **THEN** the system SHALL store the new file, create a new asset record, update `concert.posterAssetId`, and mark the old poster asset as archived

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
