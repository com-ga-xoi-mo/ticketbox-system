## Context

In-app notifications are persisted by the worker and read by the audience web via REST
(`GET /me/notifications`, `unread-count`, mark-read). There is no realtime push: a new
notification only shows after a reload. No SSE/WebSocket exists in the backend. Redis is
already in the stack (BullMQ). The audience web stores its JWT in `localStorage` and sends
it as a `Bearer` header; it is not cookie-based. The notification module already follows a
"channel abstraction" pattern (one adapter per delivery channel).

## Goals / Non-Goals

**Goals:**
- Push a "new notification" signal to a connected audience browser within ~seconds.
- Authenticate the stream without putting the long-lived JWT in a URL.
- Bridge worker→API across processes; work across multiple API instances.
- Keep the transport behind a port so WebSocket can be added later.

**Non-Goals:**
- No WebSocket, no full-payload streaming, no event replay/guaranteed delivery.
- No realtime for non-audience surfaces (organizer/admin/check-in) in this change.
- No DB schema change.

## Decisions

**1. Transport = SSE.** All current realtime needs are server→client; SSE is simpler than
WebSocket and natively reconnects with `Last-Event-ID`. *Alternative:* WebSocket — rejected;
its bidirectional/high-frequency strength isn't needed (no interactive seat contention or
live chat in the model). A `RealtimeNotificationPublisherPort` keeps the door open for a WS
adapter later.

**2. Auth = short-lived stream token (query param), not the session JWT.** `EventSource`
can't set headers. Flow: client calls `GET /me/notifications/stream-token` (Bearer) → gets a
short-lived (~60s, single-purpose) token → opens `GET /me/notifications/stream?token=<short>`.
*Alternatives:* (a) put the long JWT in the query — rejected: it leaks into access logs /
history; (b) switch to httpOnly cookie auth — rejected for now: the app is localStorage/Bearer,
so cookies add CSRF + CORS `withCredentials` + SameSite work for little gain. The short token
limits blast radius if the URL leaks.

**3. Payload = signal only.** The stream emits a tiny event (type marker + unread count);
the client re-fetches via the existing REST inbox. *Alternative:* full payload — rejected:
duplicates the notification presenter on the stream (drift risk) and bloats Redis messages,
for negligible benefit at notification frequency. Keeps REST the single source of truth.

**4. Bridge = Redis pub/sub.** Notifications are created in the worker; the SSE connection
lives in the API. In-memory events don't cross processes. The worker publishes a per-user
signal to a Redis channel (e.g. `notif:user:<id>`); each API instance subscribes and forwards
to the streams it holds. This also fans out correctly across multiple API instances.
*Alternative:* create notifications in the API request path — rejected: delivery is
deliberately async/retryable in the worker (ADR-9).

**5. Reconcile-on-connect, no replay.** Missed-while-offline notifications are handled by
the client fetching the REST inbox on (re)connect, not by replaying SSE events. Keeps the
stream stateless and simple; REST already holds full history.

## Risks / Trade-offs

- **[Token in URL]** Even short-lived, the stream token sits in the URL. → Mitigation:
  ~60s TTL, single-purpose (only opens the stream), HTTPS in prod.
- **[Connection limits]** Browsers cap ~6 concurrent HTTP/1.1 connections per origin; an
  always-open SSE consumes one. → Mitigation: one stream per tab; HTTP/2 multiplexes if
  enabled. Document the single-stream rule.
- **[Proxy/idle timeouts]** Some proxies kill idle connections. → Mitigation: periodic SSE
  comment/heartbeat to keep alive; client auto-reconnect.
- **[At-most-once signal]** A signal can be lost (no open stream, transient drop). →
  Accepted: reconcile-on-connect + REST source of truth makes this self-healing.
- **[Testability]** SSE/Redis aren't unit-test friendly. → Keep decision logic (token mint
  /verify, signal building, per-user channel naming) in pure functions/ports with fakes;
  the SSE/Redis adapters stay thin.

## Migration Plan

Additive. New endpoints + a Redis pub/sub adapter + a worker publish hook + audience-web
`EventSource` wiring. No DB migration. Rollback = remove the endpoints/adapter and the
client stream; the REST inbox keeps working unchanged.
