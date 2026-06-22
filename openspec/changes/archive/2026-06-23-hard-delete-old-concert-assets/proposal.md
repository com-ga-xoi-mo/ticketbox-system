## Why

When an organizer or admin re-uploads a poster or seating map, the system keeps the previous asset forever: the DB row is marked `ARCHIVED` and the stored file is never removed. Every replacement leaves an orphaned object in storage and a dead `ARCHIVED` row, which accumulate indefinitely and consume storage that may be billed (e.g. Cloudflare R2). We want a replacement to actually reclaim the old asset.

## What Changes

- On poster re-upload, instead of marking the previous asset `ARCHIVED`, the system **deletes** the old `Asset` row inside the same transaction and **deletes the old stored file** from object storage after the transaction commits (best-effort).
- On seating map re-upload, apply the same delete-on-replace behavior.
- The old asset's `storageKey` is captured before the row is deleted so the post-commit cleanup can target the right object.
- Storage deletion stays **outside** the DB transaction (storage is not transactional) and is best-effort: a failed delete does not fail the upload.
- **BREAKING (behavioral):** previous poster/seating-map assets are no longer retained as `ARCHIVED` history; there is no rollback to a prior asset and no audit trail of replaced files.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `concert-management`: the re-upload requirement changes from archiving the previous poster/seating-map asset to deleting it (DB row + stored object).

## Impact

- Code:
  - `concert-management/application/use-cases/upload-poster.use-case.ts` and `upload-seating-map.use-case.ts` — perform best-effort storage deletion of the replaced asset after the write transaction commits.
  - `concert-management/infrastructure/database/prisma-poster-write.repository.ts` and `prisma-seating-map-write.repository.ts` — within the transaction, delete the previous asset row and return its `storageKey` instead of setting status `ARCHIVED`.
  - Corresponding write-port types (`poster-write.port.ts`, `seating-map-write.port.ts`) — return the replaced asset's `storageKey` to the use case.
- Storage: replaced poster/seating-map objects are removed from `ObjectStoragePort` (local disk or S3/R2).
- Data: no schema migration; `AssetStatus.ARCHIVED` remains in use elsewhere (e.g. ticket types) and is simply no longer produced by asset re-upload.
- Accepted trade-off: if the post-commit storage delete fails, the file becomes an orphan with no DB record pointing to it (acceptable for current scale).
- Caching note: a stale cached `publicUrl` could briefly point at a just-deleted file (short 404 window); existing concert-write cache invalidation already mitigates this.
