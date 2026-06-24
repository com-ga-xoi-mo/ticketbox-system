## 1. Query filter + ordering

- [x] 1.1 Add a named grace constant (e.g. `ASSIGNMENT_VISIBILITY_GRACE_HOURS = 6`) in the assignment query adapter
- [x] 1.2 Add `concert: { endsAt: { gte: now - grace } }` to the `where` in `listActiveByStaffId` (keep `staffId` + `status: 'ACTIVE'`)
- [x] 1.3 Add `orderBy: { concert: { startsAt: 'asc' } }` so the soonest concert is first

## 2. Tests

- [x] 2.1 Update the adapter spec to expect the new `where` (relation filter on `concert.endsAt`) and `orderBy`
- [x] 2.2 Add coverage: an assignment for a concert ended beyond grace is excluded; one within grace is included; results are ordered by `startsAt`

## 3. Verification

- [x] 3.1 Run backend build + the checkin assignment query tests (and dependency-boundary tests) and ensure they pass
- [x] 3.2 Manual check: a staff with a finished-concert assignment no longer sees it in `GET /checkin/assignments`; a current one still appears and sorts first
