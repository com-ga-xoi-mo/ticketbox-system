## 1. Realtime publisher port + Redis adapter

- [x] 1.1 Define a `RealtimeNotificationPublisherPort` (publish a per-user signal) and a per-user channel naming helper (pure, tested)
- [x] 1.2 Implement a Redis pub/sub adapter for the port (publish side) reusing the existing Redis connection/config
- [x] 1.3 Hook the notification-create path (worker) to publish a per-user signal after an in-app notification is persisted

## 2. Stream-token auth

- [x] 2.1 Add `GET /me/notifications/stream-token` (JWT Bearer + AUDIENCE) that mints a short-lived, single-purpose stream token bound to the user
- [x] 2.2 Implement mint/verify of the stream token (short TTL ~60s, stream-only scope) as a testable unit; reject expired/invalid/wrong-scope tokens

## 3. SSE stream endpoint

- [x] 3.1 Add `GET /me/notifications/stream` SSE endpoint authenticated via the stream token (query param), resolving the user from the token
- [x] 3.2 On open, subscribe (per-user) to Redis signals and forward each as an SSE signal event; clean up the subscription on disconnect
- [x] 3.3 Send a periodic heartbeat/comment to keep the connection alive; drop signals for users with no open stream without error

## 4. Audience-web client

- [x] 4.1 After login, fetch a stream token and open `EventSource` to the stream; close it on logout
- [x] 4.2 On a signal, re-fetch `GET /me/notifications` + unread-count and update the badge/notification center
- [x] 4.3 Reconcile on (re)connect by fetching the REST inbox; auto-reconnect on drop (fresh token if needed)

## 5. Verification

- [x] 5.1 Unit tests for pure parts (token mint/verify, channel naming, signal building) pass
- [x] 5.2 Backend build + notification tests pass; client typecheck/tests pass
- [x] 5.3 Manual end-to-end: open the audience web notification center, trigger a purchase in another terminal, and confirm the badge/inbox updates without a manual reload
