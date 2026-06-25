## Context

Poster and seating-map uploads share the same shape (`upload-*.use-case.ts` → `prisma-*-write.repository.ts` → `ObjectStoragePort`). On a replacement upload the repository runs a single `$transaction` that: creates the new `Asset` (status `ACTIVE`), points the concert at it (`posterAssetId` / `seatingMapAssetId`), and sets the previous asset's status to `ARCHIVED`. The previous stored object is never removed. Over time this leaves orphaned files in object storage (local disk or S3/R2) and dead `ARCHIVED` rows.

Two hard constraints shape the implementation:
- **Storage is not transactional.** `ObjectStoragePort.deleteObject` cannot participate in the Prisma `$transaction`; a delete issued inside the transaction could not be rolled back if the transaction later aborts.
- **FK safety already exists.** Every relation pointing at `Asset` uses `onDelete: SetNull` (`Concert.posterAsset`, `Concert.seatingMapAsset`, `GuestListBatch.asset`, `ArtistBio.pressKitAsset`, `User` uploader), so deleting an `Asset` row will not violate foreign keys.

The existing upload flow already establishes the ordering pattern we mirror: it `putObject`s the new file *before* the transaction and, on transaction failure, best-effort `deleteObject`s the *new* file. This change adds the symmetric cleanup of the *old* file after a successful commit.

## Goals / Non-Goals

**Goals:**
- On poster/seating-map re-upload, delete the previous `Asset` row (in the write transaction) and delete its stored object (after commit).
- Keep storage deletion outside the transaction and best-effort, so storage hiccups never fail an otherwise-successful upload.
- Reuse the existing port/use-case/repository structure; no schema migration.

**Non-Goals:**
- No background reconciliation/sweeper job for orphans left by failed post-commit deletes (that is the "Option B" robustness path, explicitly out of scope here).
- No change to `AssetStatus.ARCHIVED` usage elsewhere (e.g. ticket types keep archiving).
- No retention/rollback/audit feature for replaced assets.
- No change to first-time uploads (no previous asset to delete).

## Decisions

### Delete old row inside the transaction; delete old object after commit
The repository, within `$transaction`, looks up the previous asset id, captures its `storageKey`, creates the new asset, repoints the concert, then `tx.asset.delete` the previous row (replacing the current `updateMany(status: ARCHIVED)`). It returns the captured `oldStorageKey` (or `null` when there was no previous asset) to the use case. After the transaction resolves, the use case calls `this.storage.deleteObject(oldStorageKey).catch(() => undefined)`.

- *Why row-delete in txn:* the row delete is transactional and FK-safe (`SetNull`), so it commits atomically with the new asset and the concert pointer.
- *Why object-delete after commit:* storage is not transactional; deleting before commit risks destroying a file for an upload that then rolls back. Deleting after commit means the worst case is a leftover file, never a lost-but-referenced file.
- *Alternative considered — keep ARCHIVED + sweeper (Option B):* more robust (tombstone retains `storageKey` for retry) but needs a scheduled job and more code. Rejected for current scale per the accepted trade-off.
- *Alternative considered — delete object inside txn:* simplest to read but unsafe (non-transactional, unrecoverable on rollback). Rejected.

### Capture `storageKey` before deleting the row
The `storageKey` must be read into a local variable before `tx.asset.delete`, because after deletion the row (and its key) is gone. The repository return type gains the replaced `storageKey`, e.g. `{ asset, concert, replacedStorageKey: string | null }`, so the use case knows what to clean up.

- *Alternative — have the use case re-query the old asset:* it would already be deleted post-commit; capturing in-txn is the only correct point.

### Best-effort, swallowed cleanup error
`deleteObject` failures are caught and ignored (matching the existing rollback-cleanup style and the spec's "cleanup failure does not fail the upload" scenarios). The `deleteObject` adapters already treat a missing object as a no-op, so a double-delete or already-absent file is harmless.

## Risks / Trade-offs

- **Post-commit storage delete fails → orphaned file with no DB pointer.** → Accepted for MVP scale; the row is already gone so there is no `storageKey` to retry from. If this becomes material, adopt Option B (archive tombstone + sweeper) later without changing the upload contract.
- **Loss of history/rollback for replaced assets.** → Intentional per proposal; replaced posters/seating maps are not recoverable.
- **Stale cached `publicUrl` briefly points at a deleted object (short 404 window).** → Existing concert-write cache invalidation already runs on these writes, keeping the window small; no extra mitigation added.
- **Concurrent replacement uploads on the same concert.** → The `$transaction` serializes the row swap; the later commit wins the concert pointer. Each upload deletes the specific previous `storageKey` it observed, so no upload deletes the other's newly-active file. Worst case is the same harmless orphan as a failed delete.

## Migration Plan

- No data or schema migration. Deploy is code-only.
- Pre-existing `ARCHIVED` asset rows and their orphaned files are left untouched by this change (out of scope); they can be cleaned up separately if desired.
- Rollback: revert the code change; behavior returns to archive-on-replace with no data cleanup required.

## Open Questions

- None blocking. (Whether to later add an orphan-reconciliation sweeper is deferred as the Option B follow-up.)
