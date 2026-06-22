## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Seating map asset replacement
The system SHALL replace, rather than retain, a concert's previous seating map asset when a new seating map is uploaded, deleting both the previous `Asset` record and its stored object.

#### Scenario: Re-upload replaces and deletes previous seating map asset
- **WHEN** an organizer uploads a new valid SVG seating map for a concert that already has a seating map asset
- **THEN** the system SHALL store the new file, create a new asset record, update `concert.seatingMapAssetId`, delete the previous seating map `Asset` record within the same transaction, and delete the previous seating map's stored object from `ObjectStoragePort` after the transaction commits

#### Scenario: Stored-object cleanup failure does not fail the seating map upload
- **WHEN** the new seating map has been persisted and `concert.seatingMapAssetId` updated, but deleting the previous seating map's stored object from `ObjectStoragePort` fails
- **THEN** the system SHALL still return the upload as successful and SHALL NOT roll back the new seating map asset
