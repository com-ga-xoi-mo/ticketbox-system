## 1. Inspect Schema and Existing Upload Pattern

- [x] 1.1 Verify Prisma schema already has `AssetKind.POSTER`, `Asset.status`, `Asset.storageKey`, `Asset.publicUrl`, `Asset.originalName`, `Asset.contentType`, `Asset.sizeBytes`, `Asset.checksum`, `Asset.uploadedById`, and `Concert.posterAssetId`; confirm no migration is needed.
- [x] 1.2 Review seating-map upload implementation (`UploadSeatingMapUseCase`, `PrismaSeatingMapWriteRepository`, `OrganizerSeatingMapController`, `AdminConcertController`, `seating-map-error.mapper.ts`, `upload-file.type.ts`) and reuse the same clean architecture boundaries for poster upload.
- [x] 1.3 Verify public catalog detail already loads and serializes `posterAsset`; add only missing assertions or mapping fixes if current behavior does not expose uploaded poster metadata.

## 2. Environment Configuration

- [x] 2.1 Add `POSTER_IMAGE_MAX_BYTES` to `packages/backend/src/platform/config/env.schema.ts` with a positive numeric default of `5242880` bytes.
- [x] 2.2 Add `posterImageMaxBytes` getter to `packages/backend/src/platform/config/platform-config.service.ts`.
- [x] 2.3 Update `.env.example` with `POSTER_IMAGE_MAX_BYTES=5242880` and a short comment explaining it controls poster upload size.

## 3. Domain Errors and Types

- [x] 3.1 Create `packages/backend/src/concert-management/domain/poster.errors.ts` with `MissingPosterFileError`, `InvalidPosterContentTypeError`, `InvalidPosterExtensionError`, `InvalidPosterMagicBytesError`, and `PosterFileTooLargeError`.
- [x] 3.2 Create `packages/backend/src/concert-management/domain/poster.types.ts` with `UploadPosterInput`, `UploadPosterResult`, and `PosterAsset` types matching the seating-map asset result shape but using `posterAssetId`.
- [x] 3.3 Create `packages/backend/src/concert-management/domain/ports/poster-write.port.ts` with `POSTER_WRITE_REPOSITORY`, `CreatePosterAssetData`, and `PosterWriteRepositoryPort.createAssetAndAssociateConcertPoster(...)`.

## 4. Poster Validation Helpers

- [x] 4.1 Implement a dependency-free poster validation helper in the application layer that maps allowed content types to extensions: `image/png` -> `.png`, `image/jpeg`/`image/jpg` -> `.jpg`/`.jpeg`, `image/webp` -> `.webp`. Normalize `image/jpg` to `image/jpeg` for the persisted `contentType`.
- [x] 4.2 Implement magic-byte checks for PNG (`89504E470D0A1A0A`), JPEG (`FFD8FF`), and WebP (`RIFF....WEBP`).
- [x] 4.3 Ensure SVG and all other content types/extensions are rejected before storage.

## 5. Upload Poster Use Case

- [x] 5.1 Create `packages/backend/src/concert-management/application/use-cases/upload-poster.use-case.ts` using dependencies `AuthorizeConcertManagementUseCase`, `ObjectStoragePort`, `PosterWriteRepositoryPort`, and `PlatformConfigService`.
- [x] 5.2 In `UploadPosterUseCase.execute`, authorize with `allowAdminOverride` support before storing; organizer calls must require ownership and admin calls must pass with `allowAdminOverride: true`.
- [x] 5.3 Validate missing/empty file, content type, extension match, `POSTER_IMAGE_MAX_BYTES`, and magic bytes before calling `ObjectStoragePort.putObject`.
- [x] 5.4 Generate a UUID asset ID, derive extension from validated content type, build storage key `posters/{concertId}/{assetId}.{ext}`, compute `publicUrl`, and compute SHA-256 checksum as `sha256:{hex}`.
- [x] 5.5 Store the poster object through `ObjectStoragePort.putObject` with the validated content type.
- [x] 5.6 Persist asset metadata and associate the concert through `PosterWriteRepositoryPort`; if persistence fails, best-effort delete the newly uploaded object and rethrow the original error.

## 6. Prisma Repository Implementation

- [x] 6.1 Create `packages/backend/src/concert-management/infrastructure/database/prisma-poster-write.repository.ts` implementing `PosterWriteRepositoryPort`.
- [x] 6.2 In one Prisma transaction, read current `concert.posterAssetId`, create an `Asset` with `kind: POSTER` and `status: ACTIVE`, update `Concert.posterAssetId`, and mark the previous poster asset `ARCHIVED` when present.
- [x] 6.3 Return domain-shaped `{ asset, concert: { id, posterAssetId } }` result with the same metadata fields used by seating-map upload.

## 7. HTTP Routes and Error Mapping

- [x] 7.1 Create `packages/backend/src/concert-management/adapters/http/poster-error.mapper.ts` mapping poster validation errors to `400`, ownership errors to `403`, and missing concerts to `404`.
- [x] 7.2 Create a dedicated `OrganizerPosterController` (`@Controller('organizer/concerts/:id')`) with endpoint `POST /organizer/concerts/:id/poster` using `FileInterceptor('file', { limits: { fileSize: POSTER_IMAGE_MAX_BYTES } })`, `JwtAuthGuard`, `RolesGuard`, and `Role.ORGANIZER`; transform `UploadedMemoryFile` into `UploadPosterInput` with `allowAdminOverride: false`. Do not add the poster route to `OrganizerSeatingMapController`.
- [x] 7.3 Add admin endpoint `POST /admin/concerts/:id/poster` with the same multipart handling and `allowAdminOverride: true`.
- [x] 7.4 Reuse `upload-file.type.ts` or a controller-local type so `Express.Multer.File` does not leak into application/domain layers.
- [x] 7.5 Ensure missing file and Multer file-size-limit failures return clear `400` responses without creating storage objects or assets.

## 8. Module Registration

- [x] 8.1 Register `POSTER_WRITE_REPOSITORY` -> `PrismaPosterWriteRepository` in `packages/backend/src/concert-management/concert-management.module.ts`.
- [x] 8.2 Register `UploadPosterUseCase` with dependencies `AuthorizeConcertManagementUseCase`, `OBJECT_STORAGE`, `POSTER_WRITE_REPOSITORY`, and `PlatformConfigService`.
- [x] 8.3 Register `OrganizerPosterController` in the module `controllers`, and add the admin poster route to the existing `AdminConcertController` (wiring `UploadPosterUseCase` into it).

## 9. Tests

- [x] 9.1 Add unit tests for poster validation: valid PNG/JPEG/WebP pass; missing file, unsupported content type, SVG, extension mismatch, spoofed magic bytes, and oversized file fail before storage.
- [x] 9.2 Add `upload-poster.use-case.spec.ts` with fakes covering valid organizer upload, non-owner forbidden, admin override upload, unique storage key generation, checksum metadata, re-upload archives old poster asset, and persistence failure deletes the newly uploaded object.
- [x] 9.3 Add Prisma repository tests or extend existing repository coverage to verify `AssetKind.POSTER`, `status: ACTIVE`, `concert.posterAssetId`, and old asset `ARCHIVED` behavior.
- [x] 9.4 Add HTTP controller tests for organizer/admin poster upload: valid upload returns asset and `posterAssetId`; missing file returns `400`; unsupported type returns `400`; oversized file returns `400`; spoofed image returns `400`; non-owner organizer returns `403`; unauthenticated request returns `401`.
- [x] 9.5 Add or update public catalog test asserting uploaded poster metadata appears in `posterAsset` for published concert detail.

## 10. Verification and Manual Smoke Test

- [x] 10.1 Run focused backend tests for concert-management poster upload and existing seating-map upload to catch shared-pattern regressions.
- [x] 10.2 Run root verification commands used by the repo (`npm run lint`, `npm run build`, and `npm run test`) or the narrower approved equivalents if full verification is too slow.
- [x] 10.3 Smoke test with `STORAGE_DRIVER=local`: upload a PNG/JPEG/WebP via Postman or curl, verify response asset metadata, verify object exists under `data/uploads/posters/{concertId}/{assetId}.{ext}`, verify DB `assets.kind = POSTER`, and verify public `GET /concerts/:slug` returns `posterAsset`.
