## Context

TicketBox backend is a NestJS modular monolith using clean/hexagonal boundaries. `concert-management` already has organizer/admin controllers, ownership authorization through `AuthorizeConcertManagementUseCase`, Prisma-backed repositories, and a completed seating-map asset upload path that stores files through the shared `ObjectStoragePort`.

The Prisma schema already contains the data needed for poster upload:

- `AssetKind.POSTER`
- `Asset` metadata fields: `storageKey`, `publicUrl`, `originalName`, `contentType`, `sizeBytes`, `checksum`, `uploadedById`, `status`
- `Concert.posterAssetId` relation to `Asset` through `ConcertPoster`

Public catalog detail already includes poster asset metadata when `posterAssetId` is populated. This change only needs the protected write path that creates poster assets and associates them to concerts.

## Goals / Non-Goals

**Goals:**

- Allow organizers to upload a poster image for concerts they own.
- Allow admins to upload a poster image for any concert through `allowAdminOverride: true`.
- Accept only raster images: PNG, JPEG, and WebP.
- Validate required file, content type, extension/content-type consistency, file size, and magic bytes before storage.
- Store poster files through the existing `ObjectStoragePort`.
- Persist poster metadata as `AssetKind.POSTER` and associate it to `concert.posterAssetId`.
- Replace existing poster assets by archiving the old asset after the new association succeeds.
- Best-effort delete the new object if database persistence fails after upload.
- Keep controllers thin and keep Multer/NestJS types out of the use case boundary.

**Non-Goals:**

- No SVG poster support and no SVG safety validation.
- No image resizing, thumbnail generation, cropping, EXIF processing, or CDN cache invalidation.
- No direct browser-to-object-storage upload or presigned URL flow.
- No database migration; the schema already contains poster asset fields.
- No public catalog endpoint change; existing detail responses will reflect the associated `posterAsset`.

## Decisions

### 1. Reuse multipart upload with Multer memory storage

Use `FileInterceptor('file')` for both routes:

```http
POST /organizer/concerts/:concertId/poster
POST /admin/concerts/:concertId/poster
Content-Type: multipart/form-data

file = poster.png
```

Controllers transform `UploadedMemoryFile` into a simple application input:

```typescript
{
  concertId,
  userId: req.user.id,
  allowAdminOverride: false, // true for admin route
  fileBuffer: file?.buffer ?? Buffer.alloc(0),
  originalName: file?.originalname ?? '',
  mimeType: file?.mimetype ?? '',
  sizeBytes: file?.size ?? 0,
}
```

Rationale: this matches the seating-map implementation, avoids temp files, and keeps upload transport concerns at the HTTP boundary.

Alternatives considered:

- Disk storage: requires temp cleanup and adds no value for small poster uploads.
- JSON base64 upload: larger payloads and less standard for browser/file clients.
- Presigned direct upload: useful later, but it would require a different trust and metadata confirmation flow.

### 2. Validate raster image type with content type, extension, and magic bytes

`UploadPosterUseCase` performs application-level validation after authorization and before storage:

1. File buffer must exist and be non-empty.
2. `mimeType` must be one of `image/png`, `image/jpeg`, `image/jpg`, `image/webp`. `image/jpg` is accepted as a non-standard alias of `image/jpeg` because some clients send it; it is normalized to `image/jpeg` for persisted `contentType`.
3. Original filename extension must match the content type:
   - `image/png` -> `.png`
   - `image/jpeg` / `image/jpg` -> `.jpg` or `.jpeg`
   - `image/webp` -> `.webp`
4. `sizeBytes` and `fileBuffer.length` must be `<= POSTER_IMAGE_MAX_BYTES`.
5. Magic bytes must match the declared type:
   - PNG: `89 50 4E 47 0D 0A 1A 0A`
   - JPEG: starts with `FF D8 FF`
   - WebP: `RIFF....WEBP`

Rationale: content type alone is client-provided and insufficient. Extension matching catches accidental wrong uploads, while magic-byte checks reject common spoofed files without adding a heavy image parsing dependency.

Alternatives considered:

- Full image decoder library: stronger validation but adds runtime dependency and processing cost.
- Accept extension-only checks: too weak for public-facing uploads.
- Reuse SVG safety validator: not applicable because posters are raster-only and SVG is rejected.

### 3. Use unique poster storage keys

Storage key convention:

```text
posters/{concertId}/{assetId}.{ext}
```

The use case generates `assetId` before upload. The same ID becomes the `Asset.id`, and `{ext}` is derived from validated content type.

Rationale: `assets.storage_key` is unique. A new UUID per upload avoids conflicts when a concert replaces its poster, while keeping keys grouped by concert.

### 4. Persist asset metadata and association atomically

The poster write repository transaction should:

1. Read the current `concert.posterAssetId`.
2. Create an `Asset` row with `kind = POSTER`, `status = ACTIVE`, generated `id`, storage metadata, checksum, original name, and uploader.
3. Update `Concert.posterAssetId` to the new asset ID.
4. Mark the previous poster asset `ARCHIVED` if one exists and differs from the new asset.

The storage upload happens before the database transaction because object storage is external I/O. If persistence fails, the use case performs best-effort `deleteObject(storageKey)` and rethrows the original error.

Rationale: database metadata and concert association must be atomic. Object storage cannot participate in the transaction, so cleanup handles the common orphan-object failure case.

### 5. Share authorization behavior across organizer and admin routes

Both routes call the same `UploadPosterUseCase`.

- Organizer route passes `allowAdminOverride: false` and actor role `ORGANIZER`.
- Admin route passes `allowAdminOverride: true` and actor role `ADMIN`.

Rationale: this matches existing admin mutations and seating-map upload behavior, preventing separate owner/admin code paths from drifting.

The organizer route lives in a dedicated `OrganizerPosterController` (`@Controller('organizer/concerts/:id')`) rather than being added to `OrganizerSeatingMapController`, keeping poster and seating-map concerns in separate adapters. The admin route is added to the existing `AdminConcertController` alongside the admin seating-map route, matching how every other admin concert mutation is grouped.

### 6. Return upload result shaped like the seating-map upload result

Successful upload returns the created asset metadata plus the updated concert pointer:

```json
{
  "asset": {
    "id": "uuid",
    "kind": "POSTER",
    "storageKey": "posters/{concertId}/{assetId}.png",
    "contentType": "image/png",
    "sizeBytes": 123456,
    "originalName": "poster.png",
    "checksum": "sha256:...",
    "publicUrl": "http://localhost:3000/storage/posters/{concertId}/{assetId}.png"
  },
  "concert": {
    "id": "uuid",
    "posterAssetId": "uuid"
  }
}
```

Rationale: consistent response shape lowers frontend/API client friction and mirrors existing asset upload conventions.

## Risks / Trade-offs

- [Risk] Magic-byte checks can confirm common file signatures but cannot prove the entire image is decodable. -> Mitigation: keep the validation dependency-free now; add decoder-based validation later if corrupted images become a practical issue.
- [Risk] Multer rejects oversized files before the use case can throw poster-specific domain errors. -> Mitigation: set the same `POSTER_IMAGE_MAX_BYTES` in both Multer limits and application validation, and map Multer limit errors to a clear `400` response where practical.
- [Risk] Storage upload can succeed while database persistence fails. -> Mitigation: best-effort delete the newly uploaded object and keep tests around cleanup behavior.
- [Risk] Old poster objects may remain in storage after replacement if only DB status is archived. -> Mitigation: this change requires archiving the old asset record; physical deletion of historical poster objects can be a later retention policy decision unless existing repository patterns already delete old objects safely.
