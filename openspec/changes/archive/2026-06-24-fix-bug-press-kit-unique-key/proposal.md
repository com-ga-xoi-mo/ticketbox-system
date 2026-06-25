## Why

Currently, if a user uploads the exact same PDF twice for the same concert, the system generates the exact same `storageKey` because it relies only on the `concertId` and the file's checksum. This causes a Prisma `P2002` unique constraint violation when attempting to insert the `Asset` record, resulting in an HTTP 500 error. Adding a UUID ensures absolute uniqueness per upload attempt.

## What Changes

- Modify `buildPressKitStorageKey` in `pdf-validation.ts` to append a randomly generated UUID (`node:crypto`'s `randomUUID()`) to the storage key.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. (This is a bug fix that changes implementation details, not spec-level requirements).

## Impact

- `packages/backend/src/ai-artist-bio/application/pdf-validation.ts`
- No API schema changes.
- Prevents 500 errors on duplicate uploads.
