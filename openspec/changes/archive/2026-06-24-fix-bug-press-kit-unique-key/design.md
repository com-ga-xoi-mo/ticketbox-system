## Context

The system currently relies on the file's checksum and `concertId` to generate a `storageKey` for PDF press kits. When the exact same file is uploaded multiple times for the same concert, the generated `storageKey` is identical, violating the `Asset` table's unique constraint and crashing the upload process.

## Goals / Non-Goals

**Goals:**
- Eliminate the unique constraint violation when uploading identical files.
- Ensure every upload attempt gets a strictly unique `storageKey`.

**Non-Goals:**
- Deduplicating identical files in object storage (saving space is secondary to upload reliability).

## Decisions

- **Append `randomUUID()` to `storageKey`:** We will append a random UUID string generated via `node:crypto`'s `randomUUID()` to the end of the storage key. This guarantees uniqueness without changing the underlying architecture.

## Risks / Trade-offs

- **Storage bloat:** If a user repeatedly uploads the exact same file, we will store multiple copies in the S3-compatible storage. This is an acceptable trade-off since object storage is cheap and users rarely spam identical large PDFs on purpose.
