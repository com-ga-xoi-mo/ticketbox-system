## Context

TicketBox already protects checkout with a Redis token-bucket rate limiter (ADR-7) and treats Redis as ephemeral-only state (ADR-2); Postgres remains the transactional source of truth, and the no-oversell reservation runs in a single locked transaction (ADR-3). Two adjacent features exist: the official waitlist (fairness after sold-out) and the presale lottery (random pre-sale selection) — both grant *purchase entitlements* consumed inside the reservation transaction.

The virtual waiting room solves a different problem: **traffic shaping at public-sale open**. It does not decide *who may buy*, only *who may enter checkout right now*, so the checkout path and database are not overwhelmed. It reuses three existing building blocks verified in the codebase: the `REDIS_CLIENT` (ioredis) provider, the SSE streaming pattern in `notification-stream.controller.ts` (mint stream token → `@Sse` with token query param → per-instance registry + heartbeat), and the optional checkout-guard attach point in the inventory-reservation repository.

## Goals / Non-Goals

**Goals:**

- Put buyers for a concert into a fair FIFO queue when its waiting room is active, and admit them so at most `K` are concurrently in checkout.
- Show each waiting user their live position via SSE.
- Issue a short-lived admission token to admitted users; require it at checkout while the room is active.
- Auto-activate a concert's room by measured load, with a manual organizer/admin override (force-on/off) and a sane default of disabled.
- Keep all volatile state (queue, active set, tokens, counters) in Redis; keep only small per-concert config in Postgres.
- Leave the no-oversell reservation transaction, rate limiting, waitlist, and lottery unchanged.

**Non-Goals:**

- Not a replacement for rate limiting (both run; rate limiting still guards abuse).
- Not fairness-after-sold-out (waitlist) and not random selection (lottery).
- No purchase entitlement semantics — the admission token grants checkout *entry*, not the right to buy a specific ticket type.
- No cross-region/global queue; scope is a single Redis deployment shared by app instances.
- No change to payment flow; the admission slot is about reaching order creation, not completing payment.

## Decisions

### Decision 1: Per-concert scope, Redis-only runtime state

One waiting room per concert. Runtime state in Redis:

- `waiting:{concertId}` — sorted set, member = userId, score = join timestamp. Position = `ZRANK` + 1.
- `active:{concertId}` — sorted set, member = userId, score = admission-token expiry (epoch ms). `|active|` = current concurrency.
- `admission:{token}` — opaque admission token metadata (`userId`, `concertId`, `expiresAt`), TTL = token TTL.
- `admission:user:{concertId}:{userId}` — reverse lookup to the user's current token.
- `load:{concertId}:counter` — rolling counter of recent checkout attempts (for auto-activation).
- `load:{concertId}:state` — `ACTIVE | INACTIVE` load-derived state.
- `load:{concertId}:lastBelowThresholdAt` — cooldown marker used to deactivate only after load stays low.

Rationale: queue position, concurrency, and tokens are derived/ephemeral — exactly what Redis is for (ADR-2). Sorted sets give O(log n) rank and range-by-score for expiry cleanup. Nothing here needs to survive a Redis flush; a lost queue simply re-forms.

Postgres holds only `waiting_room_configs` (per concert): `enabled`, `autoActivate`, `manualOverride` (`NONE | FORCE_ON | FORCE_OFF`), `maxConcurrency` (K), `admissionTtlSeconds`, `activateThreshold`, `deactivateThreshold`, and `cooldownSeconds`.

### Decision 2: Bounded-concurrency admission (keep at most K in checkout)

Admission keeps `|active| ≤ K`. A slot frees when: the admission token expires, the holder creates an order, or the holder leaves. The admit routine (idempotent, runs under a per-concert Redis lock):

1. `ZREMRANGEBYSCORE active:{c} -inf now` — drop expired tokens (auto-reclaim abandoned slots).
2. While `ZCARD active:{c} < K` and `waiting:{c}` non-empty: pop the lowest-score (earliest) waiting user, mint an admission token with `expiry = now + admissionTtl`, `ZADD active:{c}` with that expiry, and store the token so the API SSE stream can observe and emit the admitted state.

It runs on a **periodic worker tick**, and opportunistically on join/leave and on slot release, so admission is prompt without relying only on the worker cadence.

Rationale: concurrency-bounded admission holds real load steady (better than a fixed drip rate that ignores how fast people finish). Token-expiry-as-slot-reclaim means an abandoned checkout frees its slot automatically with no bookkeeping.

Alternative considered: fixed rate (N per interval). Simpler but does not track actual in-checkout occupancy; rejected in favor of the concurrency cap.

### Decision 3: Admission token is a checkout-entry guard, separate from purchase entitlements

The admission token is a random, short-lived value bound to `(userId, concertId)` in Redis and carried in the checkout request body as `waitingRoomAdmissionToken?: string`. At `POST /checkout/orders`, when the concert's room is active, a guard validates the token **atomically** (Lua: token exists, matches user+concert, not expired) **before** the reservation transaction. It does not enter the no-oversell transaction (admission is access control, not inventory). On successful order creation the slot is released so the next waiting user is admitted.

Rationale: admission is orthogonal to inventory, so a lightweight pre-reservation check keeps it out of the hot critical section. A concert can still layer per-ticket-type gates (lottery/waitlist entitlements) *inside* the reservation — the two guards compose: waiting room controls *entry*, entitlement controls *purchase right*.

Implementation constraints:
- The guard MUST NOT block checkout when the room is inactive (no token required).
- The idempotency lookup for an existing `(userId, idempotencyKey)` order MUST happen before requiring a fresh admission token, so a safe retry returns the existing order even after the original admission slot was released.
- Token validation MUST be atomic and bound to the user to prevent sharing/reuse.
- The token remains valid through order creation; releasing the slot on order creation (not on payment) keeps the room flowing.

### Decision 4: Auto-activate by load, with manual override and hysteresis

Effective active state:

1. If `enabled == false` → inactive.
2. Else if `manualOverride == FORCE_OFF` → inactive.
3. Else if `manualOverride == FORCE_ON` → active.
4. Else active only when `autoActivate == true` and load-derived state is `ACTIVE`.

Load-derived state is maintained in Redis from a rolling checkout-attempt counter: cross `activateThreshold` → `ACTIVE`; while active, dropping below `deactivateThreshold` starts/continues the cooldown marker; staying below the deactivate threshold for `cooldownSeconds` → `INACTIVE`. `FORCE_OFF` always wins for emergency disable, and `enabled` is the master switch.

Rationale: auto-activation reacts to real surges without operator babysitting; the lower deactivate threshold + cooldown prevents flapping around the boundary; the manual override makes the feature demoable/testable deterministically (no synthetic load needed) and gives ops a kill switch — the same lesson learned from the lottery's `draw-now`.

### Decision 5: SSE for live position, reusing the notification-stream pattern

Position updates use SSE: `GET /waiting-room/:concertId/stream-token` (bearer-authed) mints a short-lived stream token bound to `(userId, concertId)`; `@Sse('waiting-room/:concertId/stream')` authenticates by that token (query param, since `EventSource` cannot send headers) and pushes `{ position, status, admissionToken? }` events plus a heartbeat. Each API instance computes position/status from Redis (`ZRANK`, reverse admission lookup) for its own connected users on each stream tick, so no worker-to-API push is required; position is eventually consistent within the heartbeat interval.

Rationale: SSE is one-way server→client — exactly the shape of "your position is N". Reusing `notification-stream` (heartbeat + stream-token style) avoids new realtime infrastructure. Redis is the shared source of truth, so any API instance can serve correct positions without depending on the worker's memory.

Alternative considered: WebSocket (resale gateway + Redis pub/sub). Rejected — bidirectional and heavier than needed; REST polling rejected — worse under exactly the load this feature targets.

### Decision 6: Module/worker split mirrors waitlist and lottery

- `VirtualWaitingRoomModule`: HTTP routes (audience join/leave/status/stream + organizer/admin override/config), use cases, Redis adapter, SSE registry.
- `VirtualWaitingRoomWorkerModule`: the periodic admit-loop processor and its Bull queue, registered in the same scope as the processor; imported by `BackendWorkerModule`; the API app does not run the admit loop. The worker obtains runnable rooms from Postgres config (`enabled = true` and either `FORCE_ON` or `autoActivate = true`) and checks effective active state before admitting.

Rationale: same `@InjectQueue`/scope reasoning that shaped the waitlist and lottery worker modules; keep worker-only jobs out of the API app.

### Decision 7: Audience preflight avoids blind 429s, backend guard remains authoritative

The audience web checkout flow checks waiting-room status before `POST /checkout/orders`. If the room is active and the user is not admitted, the client enters the waiting-room view instead of hammering checkout. The backend still increments load on checkout attempts and enforces the admission token on order creation so bypassing the UI does not skip the queue.

Rationale: the waiting room should reduce meaningless checkout 429s, but the server remains the source of truth. Rate limiting still protects abuse; the waiting-room preflight shapes legitimate buyer traffic before it reaches the hot checkout path.

## Risks / Trade-offs

- [Risk] Redis unavailable → the room cannot function. → Mitigation: **fail-open by default** at the checkout guard (`WAITING_ROOM_FAIL_OPEN=true`): if active-state cannot be read, allow checkout, log, and emit a metric so an outage degrades to "no waiting room" rather than blocking all sales.
- [Risk] Admission token shared between users. → Mitigation: token bound to `userId`, validated atomically, short TTL.
- [Risk] Abandoned checkout holds a slot. → Mitigation: token expiry reclaims the slot (`ZREMRANGEBYSCORE`) with no explicit release needed.
- [Risk] Auto-activation flapping at the threshold. → Mitigation: separate activate/deactivate thresholds (hysteresis) + cooldown.
- [Risk] SSE connection storms add their own load. → Mitigation: heartbeat interval tuned, position recomputed on tick (not per Redis event), connection lifecycle cleaned up like notification-stream.
- [Risk] Thundering herd at the exact admit moment. → Mitigation: per-concert Redis lock around the admit routine; admission is idempotent.
- [Risk] Interaction with lottery/waitlist gating confuses buyers. → Mitigation: waiting room gates *entry*; entitlement gates *purchase*; UI copy distinguishes "waiting to enter" vs "waiting for your turn to buy".

## Migration Plan

1. Add `waiting_room_configs` (per concert) with enabled/auto/override flags, `K`, token TTL, thresholds, and cooldown. No backfill; rooms default disabled.
2. No Postgres runtime tables — Redis keys are created lazily at runtime and TTL-expire.
3. Enable audience join/status/SSE endpoints, organizer/admin override/config endpoints, and the checkout guard behind the per-concert active-state check.
4. Wire the admit-loop worker job; add config to platform env (default thresholds, TTL, K).
5. Rollback by disabling the feature (treat every room inactive / guard no-ops); Redis keys expire on their own.

## Open Questions

- Default values for `K`, `admissionTtlSeconds`, and the activate/deactivate thresholds (tune per environment; ship conservative defaults).
- Release the slot on order creation (preferred, keeps the room flowing) vs. on payment completion (stricter but risks starving the queue while buyers pay).
- Whether the organizer override belongs on the organizer surface, the admin surface, or both (backend allows both roles; UI is a partner task, consistent with the lottery handoff).
