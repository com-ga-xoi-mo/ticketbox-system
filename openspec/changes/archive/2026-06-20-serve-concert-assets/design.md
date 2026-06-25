## Context

TicketBox backend is a NestJS modular monolith with clean/hexagonal boundaries. The `concert-management` module already owns concert poster and seating-map asset uploads, which persist `Asset` rows (`kind`, `status`, `storageKey`, `publicUrl`, `contentType`, ...) and store binaries through the shared `ObjectStoragePort` (local filesystem or Cloudflare R2 depending on `STORAGE_DRIVER`).

Two different read paths exist today and return different shapes:

- Public catalog (`GET /concerts/:slug`) returns full asset metadata including `publicUrl`.
- Organizer/admin concert reads return the raw domain `Concert`, which carries only `posterAssetId` and `seatingMapAssetId` (UUIDs) — no `publicUrl`.

`apps/web` management screens build image URLs as `${API_BASE_URL}/assets/{assetId}`, but no `GET /assets/:id` route exists, and nothing serves the storage `publicUrl` path locally. This change adds the missing endpoint inside `concert-management` so the existing frontend assumption resolves to a real image.

## Goals / Non-Goals

**Goals:**

- Serve concert poster and seating-map image bytes by asset id through a stable, driver-agnostic URL.
- Reuse the existing `ObjectStoragePort` and `assets` table; no schema or config changes.
- Keep the endpoint public and simple.
- Return clear `404` responses for unknown, archived, out-of-scope, or storage-missing assets.
- Keep the implementation inside the `concert-management` module (no new module).

**Non-Goals:**

- No authentication or per-concert authorization (poster/seating-map images are public-facing; ids are unguessable UUIDs).
- No support for serving non-concert assets (press kits, ticket assets) through this endpoint.
- No image resizing, transformation, thumbnailing, range requests, or signed URLs.
- No change to existing concert read/upload endpoints or to `apps/web`.
- No new env configuration.

## Decisions

### 1. Public, unauthenticated endpoint

`GET /assets/:id` is public — no `JwtAuthGuard`.

Rationale: posters and seating maps are intended for public display (catalog and management previews). Asset ids are random UUIDs, so enumeration is impractical. Keeping it public avoids building an optional-authentication guard and a reverse asset-to-concert ownership lookup, matching the chosen "simple" scope.

Alternatives considered:

- Public only when the owning concert is `PUBLISHED`, else owner/admin: more protective for draft concerts but requires an optional-auth guard plus an asset-to-concert reverse lookup. Rejected for now in favor of simplicity; can be tightened later if drafts must stay private.
- Always authenticated: would break the public catalog use case and unauthenticated previews. Rejected.

### 2. Stream bytes through ObjectStoragePort instead of redirecting to publicUrl

The use case loads bytes with `ObjectStoragePort.getObject(storageKey)` and the controller returns them as a NestJS `StreamableFile`, setting `Content-Type` from the stored `Asset.contentType`.

Rationale: streaming yields one stable URL that behaves identically across the local and R2 drivers, and the frontend never needs to know driver-specific URLs. A `302` redirect to `publicUrl` would leak driver details and would not work locally (no static route serves `/storage`).

Alternatives considered:

- Redirect to `publicUrl`: lighter for CDN-backed R2 but inconsistent locally and driver-leaky. Rejected.
- Serve a static directory via `useStaticAssets`: only works for the local driver and bypasses the asset table. Rejected.

### 3. Scope to POSTER and SEATING_MAP assets

After loading the asset, the use case checks `kind`. Only `AssetKind.POSTER` and `AssetKind.SEATING_MAP` are servable; any other kind (e.g. press kit, ticket asset) is treated as not found.

Rationale: the `assets` table is shared across bounded contexts. Limiting this endpoint to concert image kinds avoids unintentionally exposing unrelated assets through a public route.

### 4. Treat unknown, archived, out-of-scope, and storage-missing as 404

The endpoint returns `404` when:

- no `Asset` row matches the id,
- the asset `status` is `ARCHIVED` (e.g. a replaced poster),
- the asset `kind` is outside `{ POSTER, SEATING_MAP }`,
- `ObjectStoragePort.getObject` throws `StorageObjectNotFoundError`.

Rationale: a uniform `404` avoids leaking which ids exist and keeps the contract simple for the frontend (missing image -> no image). Only `ACTIVE` poster/seating-map assets are servable.

### 5. Cache-Control for content-addressed assets

The response sets `Cache-Control: public, max-age=...` (e.g. one day) because an asset id maps to immutable content — replacing a concert's poster creates a new asset id rather than mutating an existing one.

Rationale: asset bytes never change for a given id, so caching is safe and reduces repeated streaming load while keeping the UI snappy.

### 6. New thin read repository, reuse ObjectStoragePort

Add an `AssetReadRepositoryPort` with `findServableAsset(id)` returning the minimal fields needed (`id`, `kind`, `status`, `storageKey`, `contentType`), implemented by a Prisma adapter. The use case depends on this port plus `ObjectStoragePort`.

Rationale: a dedicated read port keeps serving decoupled from the poster/seating-map write repositories and exposes only what serving needs. It avoids reusing a write-oriented repository for a read path.

## Risks / Trade-offs

- [Risk] Public access means anyone with an asset id (e.g. shared from a draft concert preview) can view the image. -> Mitigation: ids are unguessable UUIDs; if draft privacy becomes a requirement, add the published-or-owner authorization variant later (Decision 1 alternative).
- [Risk] Streaming proxies bytes through the API instead of a CDN, adding backend load for R2 deployments. -> Mitigation: `Cache-Control` reduces repeat fetches; a future optimization can redirect to signed/public CDN URLs per driver if load matters.
- [Risk] Serving by raw asset id could expose non-concert assets if scope is not enforced. -> Mitigation: Decision 3 restricts servable kinds to `POSTER` and `SEATING_MAP`.
