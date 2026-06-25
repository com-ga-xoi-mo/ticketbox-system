## 1. Inspect Existing Asset and Storage Patterns

- [x] 1.1 Confirm the `assets` table exposes `id`, `kind`, `status`, `storageKey`, and `contentType` via Prisma, and that `AssetKind` includes `POSTER` and `SEATING_MAP`.
- [x] 1.2 Review `ObjectStoragePort.getObject` and `StorageObjectNotFoundError` to confirm how missing objects surface, and how the local/R2 adapters behave.
- [x] 1.3 Confirm `apps/web` requests `${API_BASE_URL}/assets/{assetId}` (in `ConcertTable`, `ConcertEditPage`, `ConcertDetailPanel`) so the new route matches the existing client assumption with no frontend change.

## 2. Domain Port and Types

- [x] 2.1 Create `packages/backend/src/concert-management/domain/ports/asset-read.port.ts` with `ASSET_READ_REPOSITORY` and `AssetReadRepositoryPort.findServableAsset(id)` returning `{ id, kind, status, storageKey, contentType }` or `null`.
- [x] 2.2 Create domain types for the serve result (e.g. `ServableAsset` and `AssetContent { content: Buffer; contentType: string }`).
- [x] 2.3 Add a domain error `AssetNotServableError` (or reuse a not-found error) used for unknown/archived/out-of-scope/missing-object cases.

## 3. Prisma Read Repository

- [x] 3.1 Create `packages/backend/src/concert-management/infrastructure/database/prisma-asset-read.repository.ts` implementing `AssetReadRepositoryPort`.
- [x] 3.2 Implement `findServableAsset(id)` to select only `id`, `kind`, `status`, `storageKey`, `contentType` for the asset.

## 4. Get Asset Content Use Case

- [x] 4.1 Create `packages/backend/src/concert-management/application/use-cases/get-asset-content.use-case.ts` depending on `AssetReadRepositoryPort` and `ObjectStoragePort`.
- [x] 4.2 Load the asset; if missing, `ARCHIVED`, or kind not in `{ POSTER, SEATING_MAP }`, throw `AssetNotServableError`.
- [x] 4.3 Fetch bytes via `ObjectStoragePort.getObject(storageKey)`; if it throws `StorageObjectNotFoundError`, throw `AssetNotServableError`.
- [x] 4.4 Return `{ content, contentType }` using the asset's stored `contentType`.

## 5. HTTP Controller and Error Mapping

- [x] 5.1 Create `packages/backend/src/concert-management/adapters/http/asset.controller.ts` with `@Controller('assets')` and a public `@Get(':id')` handler (no `JwtAuthGuard`).
- [x] 5.2 Return the bytes as a NestJS `StreamableFile`, setting `Content-Type` from the result and a `Cache-Control: public, max-age=86400` header.
- [x] 5.3 Create `packages/backend/src/concert-management/adapters/http/asset-error.mapper.ts` mapping `AssetNotServableError` to `404`.

## 6. Module Registration

- [x] 6.1 Register `ASSET_READ_REPOSITORY` -> `PrismaAssetReadRepository` in `concert-management.module.ts`.
- [x] 6.2 Register `GetAssetContentUseCase` with dependencies `ASSET_READ_REPOSITORY` and `OBJECT_STORAGE`.
- [x] 6.3 Add `AssetController` to the module `controllers`.

## 7. Tests

- [x] 7.1 Add `get-asset-content.use-case.spec.ts` covering: active POSTER served, active SEATING_MAP served, unknown id -> not servable, archived -> not servable, out-of-scope kind -> not servable, and storage-missing -> not servable.
- [x] 7.2 Add controller tests: valid request streams bytes with correct `Content-Type` and `Cache-Control`; unauthenticated request succeeds; not-found cases return `404`.

## 8. Verification

- [x] 8.1 Run focused backend tests for concert-management asset serving.
- [x] 8.2 Run repo verification (`npm run lint`, `npm run build`, `npm run test`) or the narrower approved equivalents.
- [x] 8.3 Smoke test with `STORAGE_DRIVER=local`: upload a poster, then open `GET /assets/{posterAssetId}` in a browser and confirm the image renders; confirm an unknown id returns `404`; confirm the web concert pages now show the poster.
