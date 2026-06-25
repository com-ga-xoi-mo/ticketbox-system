## ADDED Requirements

### Requirement: Realtime in-app notification stream

The system SHALL provide an authenticated Server-Sent Events (SSE) stream that delivers a
signal to a connected audience user when a new in-app notification is created for them, so
the client can reflect it (unread badge / inbox) without a manual reload. The stream SHALL
carry a lightweight signal only and SHALL NOT replace the existing REST inbox as the source
of truth.

#### Scenario: New notification signals the connected user

- **WHEN** an in-app notification is created for an audience user who has an open stream
- **THEN** the system SHALL deliver a signal event on that user's stream indicating a new notification is available

#### Scenario: Signal payload is lightweight, not the full notification

- **WHEN** the stream emits a new-notification signal
- **THEN** the event SHALL carry only a small signal (e.g. a type marker and/or unread count) and SHALL NOT serialize the full notification, leaving `GET /me/notifications` as the canonical source the client re-fetches

#### Scenario: Stream is scoped to the authenticated user

- **WHEN** a user opens the stream
- **THEN** the system SHALL deliver only signals for that authenticated user's notifications and SHALL NOT leak other users' signals

#### Scenario: Non-audience or unauthenticated stream is rejected

- **WHEN** a stream is opened without valid authentication or by a non-audience principal
- **THEN** the system SHALL reject the connection and SHALL NOT open a stream

### Requirement: Short-lived stream-token authentication

Because the browser `EventSource` cannot send an `Authorization` header, the system SHALL
authenticate the stream with a short-lived, single-purpose stream token minted by an
authenticated request, passed when opening the stream, rather than placing the long-lived
JWT in the stream URL.

#### Scenario: Authenticated request mints a short-lived stream token

- **WHEN** an authenticated audience user requests a stream token via a Bearer-authenticated endpoint
- **THEN** the system SHALL return a short-lived token bound to that user and usable only to open the notification stream

#### Scenario: Stream token authorizes the stream

- **WHEN** a client opens the stream with a valid, unexpired stream token
- **THEN** the system SHALL identify the user from the token and open the stream for them

#### Scenario: Expired or invalid stream token is rejected

- **WHEN** a client opens the stream with an expired, malformed, or unknown stream token
- **THEN** the system SHALL reject the connection

#### Scenario: Long-lived JWT is not required in the stream URL

- **WHEN** the client opens the stream
- **THEN** it SHALL NOT need to place the long-lived session JWT in the stream URL; only the short-lived stream token is used

### Requirement: Cross-process realtime delivery via Redis pub/sub

The system SHALL bridge worker-created notifications to API-held SSE connections using
Redis pub/sub: the producer SHALL publish a per-user signal and the API SHALL forward it to
that user's open stream(s), behind a transport-agnostic realtime publisher port. This is
required because in-app notifications are created in the worker process while the SSE
connection is held by the API process, so an in-memory event cannot cross processes.

#### Scenario: Worker publishes a per-user signal on notification creation

- **WHEN** the worker creates an in-app notification for a user
- **THEN** it SHALL publish a per-user signal to Redis through the realtime publisher port

#### Scenario: API forwards a published signal to the matching open stream

- **WHEN** the API process holds an open stream for a user and a signal for that user is published
- **THEN** the API SHALL deliver the signal on that user's stream

#### Scenario: Signal for a user with no open stream is harmlessly dropped

- **WHEN** a per-user signal is published but the user has no open stream on any API instance
- **THEN** the system SHALL not error; the user will see the notification via the REST inbox on next load (no event replay is required)

#### Scenario: Transport is replaceable behind a port

- **WHEN** the realtime delivery mechanism is compiled or tested
- **THEN** the notification creation use-case SHALL depend on a transport-agnostic realtime publisher port, so a different adapter (e.g. WebSocket) can be added without changing the use-case

### Requirement: Stream lifecycle and reconnect

The realtime stream SHALL be resilient: the client SHALL reconcile state by re-fetching the
REST inbox on connect/reconnect rather than relying on event replay, and SHALL stop the
stream on logout.

#### Scenario: Client reconciles on connect

- **WHEN** the client opens or reopens the stream
- **THEN** the client SHALL fetch the current notifications/unread count via REST so any events missed while disconnected are reflected

#### Scenario: Stream stops on logout

- **WHEN** the user logs out
- **THEN** the client SHALL close the stream and SHALL NOT continue receiving signals

#### Scenario: Dropped connection is retried

- **WHEN** the stream connection drops
- **THEN** the client SHALL attempt to reconnect (obtaining a fresh stream token if needed) and re-reconcile on success
