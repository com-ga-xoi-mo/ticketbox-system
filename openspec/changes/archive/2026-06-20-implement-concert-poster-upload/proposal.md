## Why

Concert records already have `AssetKind.POSTER`, `Concert.posterAssetId`, and public catalog detail already exposes poster asset metadata, but there is no backend endpoint that lets organizers or admins upload and associate a real poster image. This leaves the public-facing marketing image path incomplete while seating-map assets already have a proven upload/storage/metadata pattern.

## What Changes

- Add organizer route `POST /organizer/concerts/:concertId/poster` that accepts `multipart/form-data` using field name `file`; only the concert owner may upload.
- Add admin route `POST /admin/concerts/:concertId/poster`; admins may upload for any concert via `allowAdminOverride: true`.
- Add a shared `UploadPosterUseCase` used by both routes, reusing `AuthorizeConcertManagementUseCase`, `ObjectStoragePort`, and the existing asset persistence pattern.
- Accept only raster poster images: `image/png`, `image/jpeg`, `image/jpg` (alias of JPEG, normalized to `image/jpeg`), and `image/webp`.
- Validate required file, content type, extension/content-type match, magic bytes, and maximum size from new env config `POSTER_IMAGE_MAX_BYTES`.
- Do not run SVG safety validation for posters; SVG posters are out of scope and rejected.
- Store poster binaries through `ObjectStoragePort` using key convention `posters/{concertId}/{assetId}.{ext}`.
- Persist an `AssetKind.POSTER` record in `assets` with `storageKey`, `publicUrl`, `originalName`, `contentType`, `sizeBytes`, `checksum`, `uploadedById`, and `status = ACTIVE`.
- Associate the uploaded asset to the concert by setting `concert.posterAssetId`.
- Re-upload replaces the current poster by creating a new asset, updating `concert.posterAssetId`, and marking the old poster asset `ARCHIVED`.
- On database persistence failure after storage succeeds, best-effort delete the just-uploaded object to avoid orphaned files.
- Add poster-specific domain errors and HTTP error mapping for missing file, invalid content type, invalid extension, invalid magic bytes, and oversized files.

## Capabilities

### New Capabilities

_(No new capability — this extends existing concert-management behavior.)_

### Modified Capabilities

- `concert-management`: Add requirements for organizer/admin poster image upload via `multipart/form-data`, raster image validation, poster asset persistence with `AssetKind.POSTER`, and association to `concert.posterAssetId` with old poster archival on replacement.

## Impact

- **Code**: Add `UploadPosterUseCase`, poster validation helpers, poster write repository port and Prisma implementation, domain errors, HTTP error mapper, a dedicated `OrganizerPosterController` for the organizer route plus an admin poster route added to the existing `AdminConcertController`, DTO/upload-file typing reuse, and module providers.
- **Dependencies**: No runtime dependency expected; validation uses extension, content type, size, and simple magic-byte checks.
- **Configuration**: Add `POSTER_IMAGE_MAX_BYTES` to backend env schema/config service and `.env.example`; use it for Multer `limits.fileSize` and application-level validation.
- **Database**: No schema change expected; `AssetKind.POSTER`, `assets`, and `concerts.poster_asset_id` already exist.
- **API**: Add two endpoints: organizer and admin poster upload. Public catalog detail endpoint remains unchanged and will reflect the new `posterAsset` relation after upload.
- **Storage**: Poster files are stored through shared `ObjectStoragePort` under unique keys `posters/{concertId}/{assetId}.{ext}` to avoid `assets.storage_key` conflicts across replacements.
