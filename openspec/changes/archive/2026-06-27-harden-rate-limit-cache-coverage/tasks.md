## 1. Route Coverage Audit

- [x] 1.1 Inspect current rate-limit policy definitions, decorator metadata, and actor-key derivation to confirm no policy changes are needed.
- [x] 1.2 Audit public catalog, check-in, admin, organizer, guest-list, admin-user, and AI bio controllers to identify write/heavy handlers that need missing rate-limit decorators.

## 2. Apply Missing Rate Limits

- [x] 2.1 Add `RateLimitPolicy.BROWSING` coverage to public catalog routes for list, featured, cities, detail, and availability.
- [x] 2.2 Add `RateLimitPolicy.CHECKIN_SYNC` coverage to the offline batch sync route without changing online scan behavior.
- [x] 2.3 Add `RateLimitPolicy.ADMIN_WRITE` coverage to admin/organizer concert, ticket type, poster, seating map, seating-zone, and zone-mapping write routes.
- [x] 2.4 Add `RateLimitPolicy.ADMIN_WRITE` coverage to guest-list import/discover, admin-user write, check-in staff assignment write, and AI bio upload/generation routes where those routes exist.
- [x] 2.5 Leave read-only admin/organizer/catalog routes unmodified unless they trigger write-like or heavy job behavior.

## 3. Cache TTL Alignment

- [x] 3.1 Change static public concert detail cache TTL from 60 seconds to 300 seconds.
- [x] 3.2 Confirm public list cache remains 60 seconds and availability cache remains 5 seconds.
- [x] 3.3 Confirm existing cache invalidation still clears the concert catalog namespace after concert or ticket-type writes.

## 4. Evidence Tests

- [x] 4.1 Add or update route metadata tests proving public catalog routes use `RateLimitPolicy.BROWSING`.
- [x] 4.2 Add or update route metadata tests proving check-in sync uses `RateLimitPolicy.CHECKIN_SYNC`.
- [x] 4.3 Add or update route metadata tests proving admin/organizer write and heavy routes use `RateLimitPolicy.ADMIN_WRITE`.
- [x] 4.4 Add or update cache decorator tests proving detail static TTL is 300 seconds and availability TTL remains 5 seconds.

## 5. Verification

- [x] 5.1 Run focused rate-limit metadata and cache decorator tests.
- [x] 5.2 Run related backend unit tests for affected controllers/decorators.
- [x] 5.3 Review the diff to ensure no checkout, payment, check-in business logic, frontend, waiting-room, CAPTCHA, or reconciliation behavior was changed.
