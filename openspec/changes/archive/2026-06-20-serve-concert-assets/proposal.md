## Why

The web management UI (`apps/web`) already renders concert posters and seating maps by constructing image URLs as `${API_BASE_URL}/assets/{assetId}` in `ConcertTable`, `ConcertEditPage`, and `ConcertDetailPanel`. The organizer/admin concert read endpoints return only `posterAssetId` / `seatingMapAssetId` (UUIDs), not the asset `publicUrl`, so the web client has nothing but the id to build a URL from. However, no `GET /assets/:id` endpoint exists anywhere in the backend, and no static route serves the storage `publicUrl` either. As a result, uploaded poster/seating-map images cannot be displayed in the management UI. This change adds the missing endpoint so the existing web assumption resolves to a real image, without changing the frontend.

## What Changes

- Add a public route `GET /assets/:id` in `concert-management` that resolves an asset by id and streams its binary content for display.
- Resolve the asset through a read repository, then fetch its bytes from the shared `ObjectStoragePort` using the stored `storageKey`.
- Respond with the asset's stored `contentType` and a `Cache-Control` header suitable for immutable, content-addressed assets.
- Scope the endpoint to concert image assets only: serve assets whose `kind` is `POSTER` or `SEATING_MAP`; treat any other kind as not found.
- Return `404` when the asset id does not exist, the asset is `ARCHIVED`, the asset kind is out of scope, or the underlying storage object is missing.
- Keep the endpoint public (no authentication): poster and seating-map images are public-facing marketing/catalog content, and asset ids are unguessable UUIDs.
- No new module: wire the controller, use case, and read repository into the existing `concert-management` module.

## Capabilities

### New Capabilities

_(No new capability — this extends existing concert-management behavior.)_

### Modified Capabilities

- `concert-management`: Add a public asset-serving requirement that streams `POSTER` and `SEATING_MAP` asset bytes by id through `ObjectStoragePort`, with not-found handling for unknown/archived/out-of-scope assets and missing storage objects.

## Impact

- **Code**: Add `GetAssetContentUseCase`, an asset read repository port plus Prisma implementation, an `AssetController` (`@Controller('assets')`), an HTTP error mapper, and module wiring in `packages/backend/src/concert-management/`.
- **Dependencies**: No new runtime dependency; streaming uses NestJS `StreamableFile` and the existing `ObjectStoragePort.getObject`.
- **Configuration**: No new env config.
- **Database**: No schema change; reads the existing `assets` table (`id`, `kind`, `status`, `storageKey`, `contentType`).
- **API**: Add one public endpoint `GET /assets/:id`. No change to existing organizer/admin/public concert endpoints.
- **Frontend**: No change required; `apps/web` already requests `${API_BASE_URL}/assets/{assetId}`.
- **Storage**: Bytes are streamed through the shared `ObjectStoragePort`, so the same endpoint works for the local and Cloudflare R2 drivers without exposing driver-specific URLs.
