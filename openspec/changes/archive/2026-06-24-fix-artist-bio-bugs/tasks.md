## 1. Fix Database and Domain Types

- [x] 1.1 Add `REJECTED` to the `ArtistBioStatus` enum in `prisma/schema.prisma`.
- [x] 1.2 Generate Prisma client by running `npm run db:generate`.
- [x] 1.3 Create a migration for the schema change by running `npx prisma migrate dev --name add_rejected_to_artist_bio_status`.
- [x] 1.4 Update the TypeScript `ArtistBioStatus` enum in `packages/backend/src/ai-artist-bio/domain/artist-bio.types.ts` to include `REJECTED = 'REJECTED'`.

## 2. Fix BUG-003: Rejection Status

- [x] 2.1 Modify `packages/backend/src/ai-artist-bio/application/use-cases/reject-artist-bio.use-case.ts` to set the status to `ArtistBioStatus.REJECTED` instead of `DRAFT`.
- [x] 2.2 Update any relevant tests in `reject-artist-bio.use-case.spec.ts` if they exist.

## 3. Fix BUG-004: Worker Queue Prefix

- [x] 3.1 Modify `packages/backend/src/ai-artist-bio/infrastructure/queue/artist-bio.processor.ts`. Change the `@Processor` decorator to include the `prefix` option: `@Processor({ name: ARTIST_BIO_QUEUE_NAME, prefix: process.env.QUEUE_PREFIX || 'ticketbox' })`.

## 4. Testing

- [x] 4.1 Restart the API and Worker.
- [x] 4.2 Send an upload bio request via Postman and verify the Worker picks up the job automatically without manual script execution.
- [x] 4.3 Wait for completion and verify the Reject endpoint sets the status to `REJECTED` instead of `DRAFT`.
