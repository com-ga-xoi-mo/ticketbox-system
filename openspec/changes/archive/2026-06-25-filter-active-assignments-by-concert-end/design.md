## Context

The Checkin assignment read model is implemented by
`PrismaStaffAssignmentQueryAdapter.listActiveByStaffId(staffId)`, which today runs:

```ts
where: { staffId, status: 'ACTIVE' }
select: { id, concertId, status, concert: { select: { title, startsAt } } }
```

It already navigates the `concert` relation (Prisma model `Concert`, table `concerts`,
columns `starts_at` / `ends_at`). There is no time filter and no ordering, and no job
revokes assignments when a concert ends, so finished-concert assignments persist and
surface indefinitely. The mobile app auto-picks `assignments[0]`, compounding the issue.

## Goals / Non-Goals

**Goals:**
- Hide assignments whose concert has ended beyond a grace window, at read time.
- Order eligible assignments by concert start time so `[0]` is the most relevant.
- No schema change, no data migration, no background job.

**Non-Goals:**
- No automatic DB revocation (rows stay `ACTIVE` for audit).
- No change to scan-time authorization or the assignment wire contract.
- No mobile-side change (the app keeps consuming the same raw array).

## Decisions

**1. Read-time relation filter on `concert.endsAt`.**
Add to the Prisma `where` a relation condition:
```ts
concert: { endsAt: { gte: new Date(Date.now() - GRACE_MS) } }
```
Prisma compiles this to a JOIN/EXISTS against `concerts`, returning only assignments whose
concert ends at or after `now - grace`. The assignment row is untouched. *Alternative:*
a worker job that flips status to revoked at `endsAt` — rejected: adds infrastructure,
mutates data, and needs scheduling, for no extra benefit over a read filter.

**2. Grace window = 6 hours after `endsAt` (constant).**
Check-in commonly runs past the scheduled end (late entry, overruns), so cutting exactly
at `endsAt` would drop an in-progress gate. A 6-hour grace keeps a just-ended concert
listed. Implemented as a named constant in the adapter (e.g.
`ASSIGNMENT_VISIBILITY_GRACE_HOURS = 6`). *Alternative:* make it env-configurable via
platform config — deferred; a constant is enough now and easy to promote later.

**3. Order by `concert.startsAt` ascending.**
`orderBy: { concert: { startsAt: 'asc' } }` makes the first element the soonest live or
upcoming concert, so the app's `assignments[0]` auto-pick lands on the relevant one when a
staff has several. This does not fix the broader "no UI to switch" gap (separate concern)
but makes the default sane.

## Risks / Trade-offs

- **[Clock/grace boundary]** Uses server `now`; a concert exactly at the grace edge may
  flip between requests. → Harmless: it only affects visibility of an audit-preserved row;
  scan authorization is independent.
- **[Grace too short/long]** 6h is a guess. → Mitigation: single constant, trivial to
  tune; documented in the spec scenario as the default.
- **[Boundary-test coverage]** The adapter spec asserts the exact `where`. → Update it to
  expect the new relation filter + `orderBy`, keeping the dependency-boundary guarantees.

## Migration Plan

Backend read-path change only. No migration. Rollback = revert the adapter `where`/
`orderBy`. Stored assignments are never modified, so there is nothing to undo in data.
