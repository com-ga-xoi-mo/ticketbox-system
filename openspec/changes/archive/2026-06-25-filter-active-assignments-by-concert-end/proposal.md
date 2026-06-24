## Why

`GET /checkin/assignments` lists a staff user's assignments filtered only by
`status = 'ACTIVE'` ([prisma-staff-assignment-query.adapter.ts](packages/backend/src/checkin/infrastructure/database/prisma-staff-assignment-query.adapter.ts)).
There is no time filter and no automatic revocation when a concert ends, so an assignment
for a concert that already finished stays `ACTIVE` forever and keeps being returned. The
mobile app auto-selects `assignments[0]` and routes straight to the scanner, so a staff
member can be permanently stuck on a past concert — and a current concert can be hidden
behind a stale one. Admins must manually revoke after every concert, which is error-prone.

## What Changes

- The active-assignment listing SHALL exclude assignments whose concert has already ended
  beyond a grace window (default 6 hours after `endsAt`), using the existing `concert`
  relation — without modifying the stored assignment rows (still `ACTIVE` in the DB).
- The listing SHALL be ordered by the concert start time (soonest first) so the
  auto-selected first assignment is the most relevant live/upcoming one rather than an
  arbitrary row.

This is a read-time filter + ordering change in the Checkin assignment query only. No
schema change, no data migration, no background job, and no change to scan authorization
(the backend still enforces ownership/concert/gate at scan time).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `checkin-mobile-app`: the "Checkin staff active assignment query" requirement is
  refined so the returned active assignments are bounded to concerts that have not ended
  (within a grace window) and are ordered by concert start time.

## Impact

- **Code**: `packages/backend/src/checkin/infrastructure/database/prisma-staff-assignment-query.adapter.ts`
  (add a `concert.endsAt` relation filter + `orderBy concert.startsAt`); a small constant
  for the grace window. Update/extend the adapter spec.
- **Data / schema**: none — uses existing `concerts.ends_at` / `starts_at`; assignment
  rows are unchanged.
- **Behavior preserved**: ownership, role (401/403), raw-array shape, and scan-time
  authorization are unchanged. Only which active assignments surface (and their order).
- **Trade-off**: a concert still within the grace window remains listed (intentional, to
  allow late check-in); past the grace it disappears from the list though the row stays
  `ACTIVE` for audit.
