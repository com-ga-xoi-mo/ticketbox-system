## Why

When a high-demand concert's public sale opens, thousands of buyers hit `POST /checkout/orders` at the same moment (thundering herd). Platform rate-limiting sheds load but does not give waiting buyers a fair, visible place in line, and unbounded concurrency stresses the no-oversell reservation transaction and the database. TicketBox needs a **virtual waiting room** that puts buyers in a fair per-concert queue, admits them into checkout in a controlled way, and shows each person their position in real time — protecting the checkout path without changing how inventory is reserved.

This is distinct from the official waitlist (fairness *after* sold-out) and the presale lottery (random pre-sale selection): the waiting room only **shapes traffic into checkout**. It grants an *admission token* (permission to enter checkout), not a *purchase entitlement* (permission to buy a specific ticket type).

## What Changes

- Add a per-concert virtual waiting room whose runtime state lives entirely in **Redis** (ephemeral, per ADR-2): a FIFO waiting queue (sorted set, position by join time) and an active set of admitted users (bounded by a configured concurrency `K`).
- Admit users to keep at most `K` concurrent in checkout: when a slot frees (admission token expires, or the holder creates an order or leaves), admit the next waiting user and issue a **short-lived admission token**.
- Push live queue-position updates over **SSE**, reusing the existing `notification-stream` pattern (mint a short-lived stream token bound to the user and concert, then subscribe via `@Sse` with the token as a query param + heartbeat). The API stream reads Redis on its tick; the worker only updates Redis admission state.
- **Auto-activate** a concert's waiting room when incoming checkout load crosses a configured threshold (Redis rolling counter), and auto-deactivate after load subsides (with a cooldown). Provide a **manual organizer/admin override** to force-on / force-off (for demos, testing, and ops safety). Default: disabled.
- Guard `POST /checkout/orders`: if the concert's waiting room is inactive, checkout proceeds normally; if active, the request must carry a **valid admission token bound to the requesting user** (validated against Redis) before the reservation transaction runs, otherwise it is rejected and the client is directed to the queue.
- Add audience-facing waiting-room UI: join the queue, see live position via SSE, and proceed to checkout once admitted.
- Add a small per-concert **Postgres config** (enabled flag, auto-activate flag, manual override, concurrency `K`, admission-token TTL, activate/deactivate thresholds, cooldown) so operators can tune each concert; keep all volatile queue/token/counter state in Redis only.
- Keep the PostgreSQL no-oversell reservation critical section unchanged; keep platform rate-limiting running alongside (not replaced); keep the waitlist and lottery mechanisms unchanged. The admission token is a new, separate mechanism from purchase entitlements.

## Capabilities

### New Capabilities

- `virtual-waiting-room`: Per-concert Redis-backed waiting queue and bounded admission, admission-token issuance/validation, SSE position streaming, auto-activation by load with manual override, and per-concert configuration.

### Modified Capabilities

- `ticket-purchase`: Checkout for a concert whose waiting room is active requires a valid admission token bound to the requesting user before creating an order; when the waiting room is inactive, checkout is unchanged.
- `audience-checkout`: Audience web shows the waiting-room queue state (position via SSE) and lets an admitted user proceed to checkout with their admission token.

The new admission-control layer complements the existing `platform-protection` rate limiting (both run); it lives entirely in the new `virtual-waiting-room` capability and does not change any `platform-protection` requirement.

## Impact

- Backend modules: new `virtual-waiting-room` bounded context (HTTP: join/status/SSE + organizer/admin override) plus a worker submodule running the periodic admit loop, mirroring the `official-waitlist` / `presale-lottery` module/worker split. Ordering checkout guard gains an admission-token check hooked at the same point as the entitlement guard.
- Redis: new keys per concert — `waiting:{concertId}` (sorted set), `active:{concertId}` (sorted set by token expiry), opaque admission-token records plus reverse user lookup, and rolling load/cooldown state; all TTL-managed, no Postgres persistence of runtime state.
- Database: new per-concert waiting-room config (enabled/auto flags, `K`, token TTL, threshold). No change to `orders`/`ticket_types` reservation columns.
- APIs: audience join/leave/status + SSE stream-token + `@Sse` position stream; organizer/admin force-on/off + config; checkout guard recognizes an active waiting room and requires `waitingRoomAdmissionToken` in the create-order body.
- Realtime: SSE controller uses a per-concert stream token and reads Redis on stream ticks; Redis-backed so it works across instances without worker-to-API in-memory pushes.
- Frontend: audience waiting-room screen (join, live position, "it's your turn" → checkout).
- Tests: unit/integration for FIFO position, bounded `K` admission, token issue/expire/consume, checkout guard (active vs inactive), auto-activate threshold + manual override, and no regression to the no-oversell reservation path.
