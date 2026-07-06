## Context

TicketBox already has the core platform-protection infrastructure: Redis-backed token buckets, route metadata decorators, rate-limit policies, concert catalog cache decorators, cache invalidation on catalog writes, and short-TTL availability caching. The remaining gap is coverage: several routes that the blueprint treats as protected entry points are not yet explicitly attached to the relevant rate-limit policy, and static concert detail cache TTL is shorter than the blueprint target.

This change is a hardening pass before full-system verification. It should make the existing implementation visibly match the accepted platform-protection contract without changing checkout, payment, check-in, or frontend business behavior.

## Goals / Non-Goals

**Goals:**

- Attach `BROWSING` rate limiting to public concert catalog routes.
- Attach `CHECKIN_SYNC` rate limiting to offline check-in batch sync.
- Attach `ADMIN_WRITE` rate limiting to admin/organizer write or heavy job routes.
- Keep read-only admin/organizer routes free of unnecessary write limits.
- Set static public concert detail cache TTL to 300 seconds while preserving list TTL 60 seconds and availability TTL 5 seconds.
- Add lightweight tests that prove route metadata and TTL values are actually wired.

**Non-Goals:**

- No waiting room or fair queue implementation.
- No CAPTCHA, device fingerprinting, behavioral bot detection, or advanced abuse detection.
- No rewrite of the token bucket implementation.
- No checkout/payment/check-in business flow changes.
- No payment reconciliation or provider integration changes.
- No frontend changes.

## Decisions

### Decision 1: Harden by route metadata, not by changing the interceptor

The existing `@RateLimited(...)` decorator and global/interceptor behavior remain the enforcement mechanism. This change should add missing metadata to route handlers instead of introducing a second middleware path.

Rationale:

- The rate limiter already has endpoint-specific policies and actor key derivation.
- Route-level metadata is easy to audit and test.
- Reusing the existing interceptor avoids divergent enforcement behavior.

Alternatives considered:

- Apply a broad controller-level default to all routes. This is riskier because it can rate-limit read-only admin routes or internal callback routes unintentionally.
- Add a new global path matcher. This duplicates route knowledge outside controllers and is harder to keep in sync.

### Decision 2: Limit public browsing by catalog route class

Public catalog routes should use `RateLimitPolicy.BROWSING`:

- `GET /concerts`
- `GET /concerts/featured`
- `GET /concerts/cities`
- `GET /concerts/:slug`
- `GET /concerts/:slug/availability`

Rationale:

- These routes are the read-heavy paths called during sale spikes.
- Cache reduces database load, but rate limiting still protects API CPU, network, JSON serialization, and cache infrastructure from excessive clients.

### Decision 3: Limit check-in sync by device-oriented policy

`POST /checkin/sync` should use `RateLimitPolicy.CHECKIN_SYNC`. Online scans can remain separately evaluated because scan retries have different user-facing latency and operational behavior.

Rationale:

- Sync batches can be larger and can retry aggressively after network recovery.
- The existing actor-key service already derives check-in sync keys from device identity when available.

### Decision 4: Limit admin and organizer write/heavy actions, not read-only admin routes

Admin and organizer routes that mutate data or enqueue heavy processing should use `RateLimitPolicy.ADMIN_WRITE`. Read-only dashboard/list/detail routes should not be changed unless they trigger write-like processing.

Target write/heavy groups:

- concert create/update/publish/cancel
- ticket type create/update/archive
- poster upload
- seating map upload, seating-zone updates, zone mappings
- guest-list import/discover actions
- admin user create/update/status writes
- AI artist bio upload/generation actions
- check-in staff assignment writes

Rationale:

- These routes can create jobs, invalidate caches, write files, or mutate important state.
- Admin reads are less dangerous and should not be made frustrating without a clear need.

### Decision 5: Align static detail cache TTL with blueprint while keeping availability short

Public concert detail static data should use a 300-second TTL. Availability remains 5 seconds and is composed into detail responses separately. Concert list remains 60 seconds.

Rationale:

- Static concert details change infrequently and are actively invalidated on admin/organizer writes.
- Availability must remain near-real-time.
- Keeping list at 60 seconds avoids changing existing list freshness behavior.

## Risks / Trade-offs

- [Risk] Accidentally rate-limiting read-only admin workflows could make management pages feel unreliable. -> Mitigation: only attach `ADMIN_WRITE` to write/heavy handlers and cover them with route metadata tests.
- [Risk] Public detail cache at 300 seconds could serve stale static data if invalidation is broken. -> Mitigation: rely on existing invalidating write decorators and keep tests that verify invalidation paths still clear the catalog namespace.
- [Risk] Browsing rate limits can affect legitimate users behind shared NAT. -> Mitigation: use the existing browsing policy thresholds and avoid changing policy numbers in this change.
- [Risk] Check-in sync throttling can delay sync after a venue reconnects. -> Mitigation: keep this to the existing policy and return `Retry-After` so clients can back off deterministically.

## Migration Plan

1. Add missing route decorators using existing policies.
2. Update static detail TTL constant to 300 seconds.
3. Add metadata tests and TTL tests.
4. Run focused unit tests for rate-limit metadata and cache decorators.

Rollback is simple: remove the added decorators and restore the previous detail TTL if unexpected operator friction appears.

## Open Questions

- None. Waiting room remains a future change after the rate-limit baseline is fully wired.
