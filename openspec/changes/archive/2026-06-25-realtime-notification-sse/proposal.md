## Why

The audience web app has a working notification inbox (REST: list, unread-count,
mark-read) and the worker persists `IN_APP` notifications (purchase confirmation, concert
reminders, and now refund/support status changes). But there is **no realtime delivery**:
a newly created notification only appears after the user reloads or manually re-fetches.
There is no SSE/WebSocket anywhere in the backend today.

All current and near-term realtime needs (notifications, refund/support status changes,
payment status, queue position) are **server→client only**, so Server-Sent Events (SSE)
is the right transport — simpler than WebSocket, which is only justified by high-frequency
bidirectional flows (e.g. interactive seat contention) that the data model does not yet
support. We push realtime behind a transport-agnostic port so a WebSocket adapter can be
added later for such a feature without reworking notifications.

## What Changes

- Add a **realtime notification stream** so a newly created `IN_APP` notification reaches
  the connected audience browser within ~seconds, updating the unread badge / inbox
  without a manual reload.
- **Transport: SSE.** Expose an authenticated SSE endpoint the audience web opens with
  `EventSource`.
- **Auth: short-lived stream token.** Because `EventSource` cannot send the `Authorization`
  header, the client first calls an authenticated REST endpoint (Bearer) to mint a
  short-lived, single-purpose stream token, then passes it as a query param when opening
  the stream. The long-lived JWT is never placed in a URL.
- **Payload: signal only.** The stream pushes a small "you have a new notification"
  signal; the browser re-fetches via the existing `GET /me/notifications` /
  `unread-count`. No notification serialization is duplicated on the stream.
- **Bridge: Redis pub/sub.** Notifications are created in the **worker** process but the
  SSE connection lives in the **API** process. The worker publishes a per-user signal to
  Redis (already in the stack); the API subscribes and forwards it to that user's open
  stream. This also lets the stream work across multiple API instances.
- Introduce a transport-agnostic realtime publisher/subscriber **port** so the SSE
  adapter is replaceable/extendable (future WebSocket) without touching notification
  use-cases.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `notification-delivery`: add realtime delivery requirements — an authenticated SSE
  stream for an audience user's in-app notifications, short-lived stream-token auth,
  signal-only payload, and worker→API delivery over Redis pub/sub behind a port.

## Impact

- **Backend**: new SSE controller endpoint (`GET /me/notifications/stream`) + stream-token
  endpoint (`GET /me/notifications/stream-token`), a `RealtimeNotificationPublisherPort`
  (worker side) + subscriber wiring (API side) implemented with a Redis pub/sub adapter,
  and a hook so the existing notification-create path publishes a per-user signal.
- **Frontend** (`apps/audience-web`): open `EventSource` after login, on signal re-fetch
  notifications and update the badge/center; close on logout; reconnect on drop.
- **Infra**: reuses the existing Redis; no new service. No DB schema change (notifications
  already persisted).
- **Out of scope**: WebSocket, full-payload streaming, and realtime for any non-audience
  surface. Missed-while-disconnected events are covered by the client re-fetching the REST
  inbox on (re)connect rather than event replay.
