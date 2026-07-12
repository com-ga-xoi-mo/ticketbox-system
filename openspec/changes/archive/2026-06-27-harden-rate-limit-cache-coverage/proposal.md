## Why

TicketBox already has Redis token-bucket rate limiting and public concert caching, but the protection is not consistently attached to every high-risk route described in the blueprint. Before full-system verification, the route coverage and concert detail cache TTL need to match the accepted platform-protection design so tests prove the actual API surface is protected, not just the shared infrastructure.

## What Changes

- Apply browsing rate limiting to public concert catalog endpoints that receive high read traffic.
- Apply check-in sync rate limiting to the offline batch sync endpoint by device identity.
- Apply admin write rate limiting to concert, ticket type, seating map, poster, guest-list import, admin-user, and AI bio write/heavy endpoints where appropriate.
- Keep read-only admin/organizer endpoints unmodified unless they perform write-like or heavy job behavior.
- Adjust static public concert detail cache TTL from 60 seconds to 300 seconds, while keeping list cache at 60 seconds and availability cache at 5 seconds.
- Add lightweight evidence tests for route metadata and cache TTL behavior.
- Do not introduce waiting room, CAPTCHA, advanced bot detection, payment reconciliation, or business-flow changes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `platform-protection`: Clarify and enforce that token-bucket policies are attached to the relevant public browsing, check-in sync, and admin/organizer write routes, and that public concert detail static cache uses the blueprint TTL while availability remains short-lived.

## Impact

- Affected backend controllers:
  - `packages/backend/src/concert-management/adapters/http/public-concert-catalog.controller.ts`
  - `packages/backend/src/checkin/adapters/http/checkin.controller.ts`
  - admin/organizer concert, ticket type, seating map, poster, guest-list import, admin user, and AI bio controllers with write/heavy actions.
- Affected cache decorator:
  - `packages/backend/src/concert-management/application/cache/caching-get-public-concert-detail.use-case.ts`
- Affected tests:
  - rate-limit route metadata tests for policy coverage.
  - concert cache decorator tests for static detail TTL and availability TTL.
- No API contract shape changes and no frontend changes are expected.
