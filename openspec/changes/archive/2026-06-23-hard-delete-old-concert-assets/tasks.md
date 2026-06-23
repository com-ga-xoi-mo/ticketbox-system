## 1. Poster write path

- [x] 1.1 In `poster-write.port.ts`, extend the `createAssetAndAssociateConcertPoster` return type to include the replaced asset's storage key (e.g. `replacedStorageKey: string | null`).
- [x] 1.2 In `prisma-poster-write.repository.ts`, inside the `$transaction`: after repointing `concert.posterAssetId`, when `currentAssetId` exists and differs from the new asset, look up the previous asset's `storageKey`, then `tx.asset.delete` that row instead of `updateMany({ status: ARCHIVED })`; return the captured key as `replacedStorageKey` (`null` when there was no previous asset).
- [x] 1.3 In `upload-poster.use-case.ts`, after the repository call resolves (transaction committed), best-effort delete the replaced object: `if (replacedStorageKey) await this.storage.deleteObject(replacedStorageKey).catch(() => undefined);`. Keep this outside/after the existing try/catch that rolls back the newly uploaded object.

## 2. Seating map write path

- [x] 2.1 In `seating-map-write.port.ts`, extend the `createAssetAndAssociateConcertSeatingMap` return type to include `replacedStorageKey: string | null` (mirror task 1.1).
- [x] 2.2 In `prisma-seating-map-write.repository.ts`, apply the same in-transaction change as 1.2 (capture previous `storageKey`, `tx.asset.delete`, return `replacedStorageKey`).
- [x] 2.3 In `upload-seating-map.use-case.ts`, best-effort delete the replaced object after commit (mirror task 1.3).

## 3. Tests

- [x] 3.1 Update/added poster repository tests: re-upload deletes the previous `Asset` row (row no longer exists) and returns its `storageKey`; first upload returns `replacedStorageKey: null`.
- [x] 3.2 Update/added poster use-case tests: on re-upload, `storage.deleteObject` is called with the previous asset's `storageKey`; a thrown `deleteObject` does not fail the upload (result still returned).
- [x] 3.3 Mirror 3.1 and 3.2 for the seating map repository and use case.
- [x] 3.4 Remove or update any existing assertions expecting the previous asset to be marked `ARCHIVED` on re-upload.

## 4. Verification

- [x] 4.1 Run the backend test suite for the concert-management module and confirm green.
- [x] 4.2 Run `openspec validate hard-delete-old-concert-assets --strict` and confirm the change validates.
- [x] 4.3 Manual check (local storage driver): upload a poster, re-upload a different poster, confirm the new file exists under `data/uploads/posters/...`, the old file is gone, and the old `Asset` row is deleted.
