## Why

We need to fix two critical bugs in the AI Artist Bio generation flow:
- **BUG-003**: Rejecting an artist bio incorrectly sets its status to `DRAFT` instead of `REJECTED`, obscuring the rejection history and incorrectly blending rejected bios with drafts.
- **BUG-004**: The background worker fails to process artist bio generation jobs because it listens to the default `bull:` prefix queue instead of the configured `ticketbox:` queue used by the API producer.

## What Changes

- Add `REJECTED` status to the `ArtistBioStatus` enum in Prisma schema and domain types.
- Update `RejectArtistBioUseCase` to use `ArtistBioStatus.REJECTED` instead of `ArtistBioStatus.DRAFT`.
- Explicitly configure the queue prefix for the `ArtistBioProcessor` worker so it aligns with the application-wide configuration.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `admin-artist-bio-review`: Rejection sets the bio status to `REJECTED` instead of `DRAFT`.
- `ai-artist-bio-generation`: The generation job is now successfully picked up and processed by the worker without manual intervention.

## Impact

- **Database**: `schema.prisma` will require a migration to add `REJECTED` to the `artist_bio_status` ENUM in PostgreSQL.
- **Queueing**: The worker will now automatically process background jobs for the `artist-bio.processing` queue using the correct Redis key prefix.
