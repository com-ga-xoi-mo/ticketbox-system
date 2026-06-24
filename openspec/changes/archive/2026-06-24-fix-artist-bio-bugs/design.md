## Context

The system has two key issues in the AI artist bio flow:
1. When an admin or organizer rejects an artist bio, the state is incorrectly saved as `DRAFT` because the database schema and application domain are missing a `REJECTED` status for artist bios. This breaks the state machine and prevents proper tracking.
2. The `ArtistBioProcessor` (worker) is currently picking up jobs from the `bull:artist-bio.processing` queue, but the API (producer) pushes jobs to `ticketbox:artist-bio.processing`. This mismatch happens because the worker is missing an explicitly defined `prefix`.

## Goals / Non-Goals

**Goals:**
- Fix BUG-003 by adding the `REJECTED` state to the `ArtistBioStatus` enum across the PostgreSQL database and TypeScript definitions.
- Ensure the `RejectArtistBioUseCase` assigns the `REJECTED` status when a bio is rejected.
- Fix BUG-004 by injecting the correct `queuePrefix` into the `@Processor` options for the `ArtistBioProcessor`.

**Non-Goals:**
- We are not redesigning the state machine logic or changing how AI artist bios are generated.

## Decisions

- **Modifying the Prisma Schema:** `REJECTED` will be added to the `artist_bio_status` enum in PostgreSQL to align with `AssetStatus` and other statuses. A new migration will be created and applied.
- **Worker Configuration:** To maintain DRY principles and system-wide consistency, the worker prefix will be extracted from `process.env.QUEUE_PREFIX`, defaulting to `ticketbox` to match the application's global setting. 

## Risks / Trade-offs

- **Risk:** Database enum modification is a schema change.
- **Mitigation:** PostgreSQL supports adding values to an ENUM type safely. Using Prisma's `migrate dev` handles this cleanly.
