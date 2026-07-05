# notification-delivery Specification

## Purpose
TBD - created by archiving change define-ticketbox-blueprint. Update Purpose after archive.
## Requirements
### Requirement: Purchase confirmation notifications

The system SHALL send an in-app notification and email confirmation with e-ticket access after
successful payment. When an order transitions to the paid state and its e-tickets are issued, the
system SHALL enqueue exactly one purchase confirmation per order, and a failure to enqueue or deliver
the confirmation SHALL NOT roll back the paid order or the issued tickets. The purchase
confirmation email SHALL include human-readable details and one scannable QR image for every issued
ticket in the order. QR payloads and image bytes SHALL be recreated only for the active delivery
attempt and SHALL NOT be persisted in notification records, queue payloads, object storage, or
logs.

#### Scenario: Paid order queues confirmation

- **WHEN** an order becomes paid
- **THEN** the system SHALL enqueue confirmation notifications for the customer

#### Scenario: Paid-order ticket issuance triggers confirmation enqueue

- **WHEN** the paid-order flow issues e-tickets for a newly paid order
- **THEN** the system SHALL enqueue a purchase confirmation job carrying the customer's email and
  display name, the concert title and start time, the ticket count, the order identifier, and an
  e-ticket access URL
- **AND** the job SHALL NOT contain raw QR payloads or QR image bytes

#### Scenario: Single issued ticket is delivered by email

- **WHEN** the notification worker delivers a purchase confirmation for an order with one issued
  ticket
- **THEN** the email SHALL identify the ticket number, ticket type, concert title, and concert
  start time
- **AND** the email SHALL contain a scannable PNG QR image representing that ticket's signed
  payload

#### Scenario: Multiple issued tickets receive distinct QR images

- **WHEN** the notification worker delivers a purchase confirmation for an order with multiple
  issued tickets
- **THEN** the email SHALL contain one clearly identified QR image for each issued ticket
- **AND** each image SHALL encode the payload of its corresponding ticket rather than a shared
  order-level payload

#### Scenario: QR delivery material is generated transiently

- **WHEN** the notification worker prepares a purchase confirmation delivery attempt
- **THEN** it SHALL load existing issued tickets, recreate each payload using the configured QR
  token secret, and render the QR PNG in memory
- **AND** it SHALL NOT persist the raw payload, PNG bytes, signing secret, or QR content in
  PostgreSQL, Redis job data, object storage, or application logs

#### Scenario: Confirmation enqueue is idempotent per order

- **WHEN** the paid-order transition for the same order is processed more than once
- **THEN** the system SHALL NOT create duplicate confirmation notifications for that order
- **AND** it SHALL NOT issue duplicate tickets

#### Scenario: Email delivery failure is retried

- **WHEN** email sending fails transiently
- **THEN** the system SHALL retry delivery without rolling back the paid order
- **AND** each retry SHALL recreate QR images from the existing issued tickets without issuing new
  tickets

#### Scenario: Missing issued-ticket data fails delivery safely

- **WHEN** a purchase confirmation delivery attempt cannot load the issued tickets expected for the
  paid order
- **THEN** the attempt SHALL fail through the existing bounded retry flow
- **AND** the notification worker SHALL NOT create, repair, or mutate tickets

#### Scenario: Existing notification channels remain compatible

- **WHEN** a notification other than a QR purchase confirmation is delivered
- **THEN** the existing in-app, Maildev, and authenticated SMTP behavior SHALL continue without
  requiring attachments

### Requirement: Concert reminder notifications
The system SHALL send a reminder to every valid ticket holder of a published concert approximately
24 hours before the concert start time. The reminder SHALL be created as both an in-app notification
and an email: the in-app notification is delivered by persistence (created in a sent state, readable
in the app, not routed through a channel adapter), while only the email is routed through the
notification channel adapter via the delivery queue. A scheduled worker job SHALL periodically scan
for upcoming concerts and enqueue reminder work; each user SHALL receive at most one reminder per
concert per channel. Concert start times SHALL be treated as absolute instants; the 24-hour boundary
is evaluated as pure instant arithmetic, and the operating timezone (`Asia/Ho_Chi_Minh`) is used
only to format the human-readable start time shown to users. Reminder email delivery SHALL use
bounded retry attempts in the worker and SHALL NOT run in the request path.

Only concerts with a **published** status SHALL be reminded; draft, cancelled, and ended concerts
SHALL be excluded. A **valid ticket holder** is a user who holds at least one active (issued or
checked-in, i.e. not voided or refunded) ticket on a **paid** order for the concert. The
notification module SHALL obtain concert start time and the valid ticket-holder list through a read
port, not by importing other modules' persistence models directly. The reminder use case SHALL NOT
depend on the queue; enqueuing of email delivery jobs SHALL occur in the worker processor (adapter
layer), keeping the application layer free of queue dependencies.

#### Scenario: Reminder job finds ticket holders
- **WHEN** the scheduled reminder scan runs and a concert's start time falls within the window
  `[now + 24h, now + 24h + scanInterval)`
- **THEN** the system SHALL enqueue reminder notifications for every valid ticket holder of that concert

#### Scenario: In-app reminder is created in a sent state
- **WHEN** a reminder is processed for a valid ticket holder
- **THEN** the system SHALL persist an in-app reminder in a sent state (readable in the app) without
  routing it through a channel adapter or the delivery queue

#### Scenario: Email reminder is queued for channel delivery
- **WHEN** a reminder is processed for a valid ticket holder
- **THEN** the system SHALL persist an email reminder in a pending state and enqueue exactly one
  delivery job for it on the delivery queue, sent through the registered email channel adapter

#### Scenario: Each user is reminded at most once per concert
- **WHEN** the scheduler scans the same concert in overlapping runs, or a previously reminded user
  is encountered again
- **THEN** the system SHALL NOT create or send a duplicate reminder for a user/concert/channel that
  already has a reminder, identified by a deterministic dedupe key

#### Scenario: Only published concerts are reminded
- **WHEN** the reminder scan encounters a concert whose status is not published (draft, cancelled,
  or ended)
- **THEN** the system SHALL NOT create, enqueue, or send reminders for that concert

#### Scenario: Rescheduled concert is re-evaluated against the new start time
- **WHEN** a concert's start time changes
- **THEN** the reminder scan SHALL evaluate the 24-hour window against the new start time, and the
  dedupe key SHALL prevent resending to users who were already reminded for that concert

#### Scenario: Reminder email delivery failure is retried with bounded attempts
- **WHEN** sending a reminder email fails transiently
- **THEN** the worker SHALL retry delivery up to the configured bounded attempt limit without
  blocking other reminders, and SHALL mark the notification failed after attempts are exhausted

### Requirement: Extensible notification channels
The system SHALL model notification delivery through channel adapters so future SMS or Zalo OA channels can be added without changing purchase logic.

#### Scenario: New channel is added
- **WHEN** a new notification channel adapter is registered
- **THEN** existing notification use cases SHALL be able to route messages through that adapter by configuration

### Requirement: Notification delivery lint gate compliance
The notification delivery test and support code SHALL satisfy the repository ESLint gate without changing notification delivery runtime behavior.

#### Scenario: Notification support code passes lint
- **WHEN** the repository lint command runs after this change is implemented
- **THEN** notification delivery test doubles, support adapters, and processor specs SHALL not report unused-parameter or type-only import ESLint errors

#### Scenario: Notification behavior remains unchanged
- **WHEN** the notification delivery regression tests run after the lint cleanup
- **THEN** purchase confirmation creation, email delivery retry behavior, and notification processor behavior SHALL continue to pass without queue contract, email behavior, database schema, API surface, or mobile app changes

### Requirement: Notification adapter structure is explicit
The system SHALL organize notification delivery folders so contributors can identify worker-driven inbound queue adapters, infrastructure provider implementations, and intentionally absent HTTP adapters without changing notification runtime behavior.

#### Scenario: Worker-driven inbound adapters are visible
- **WHEN** a contributor inspects the notification module
- **THEN** BullMQ processors SHALL be located under an inbound queue adapter boundary and documented as the worker-triggered entry points for notification delivery

#### Scenario: Infrastructure implementations are visible
- **WHEN** the notification module persists notifications, enqueues notification jobs, or sends email
- **THEN** the Prisma repository, queue producer, and email channel implementations SHALL be located under notification infrastructure boundaries while preserving the existing notification ports and integration contracts

#### Scenario: HTTP adapter absence is intentional
- **WHEN** a contributor inspects the notification module
- **THEN** the module SHALL document that no notification HTTP adapter exists in this slice because notification delivery is currently triggered by worker events and queue jobs

#### Scenario: Payment integration remains external
- **WHEN** payment/order fulfillment emits a paid-order notification event in a later change
- **THEN** it SHALL use the existing notification producer/event contract without moving payment fulfillment logic into the notification module

#### Scenario: Runtime notification contracts remain unchanged
- **WHEN** the notification module structure is refactored
- **THEN** queue names, job names, queue payloads, email behavior, database schema, public API surface, and notification business logic SHALL remain unchanged

### Requirement: Authenticated SMTP email delivery

The system SHALL support delivering notification email through an authenticated, TLS-capable SMTP
provider (such as Gmail) selected by configuration, without changing notification use-cases or the
existing local/Maildev delivery path.

#### Scenario: Authenticated TLS transport is used when credentials are configured

- **WHEN** the email provider is `smtp` and SMTP username and password are configured
- **THEN** the system SHALL deliver email through an authenticated, TLS-capable SMTP transport using
  the configured host, port, secure flag, and credentials

#### Scenario: Maildev path is preserved when no credentials are configured

- **WHEN** the email provider is `smtp` and no SMTP username/password are configured
- **THEN** the system SHALL continue to use the existing plaintext SMTP transport for the local
  Maildev demo, unchanged

#### Scenario: Delivery failures remain retryable

- **WHEN** sending through the authenticated SMTP transport fails transiently
- **THEN** the failure SHALL surface to the worker's bounded-retry delivery flow without changing the
  paid order or notification persistence

### Requirement: Support and refund notifications
The system SHALL create in-app notifications for support request and refund request lifecycle updates, with optional email delivery for user-visible milestones.

#### Scenario: Support request is created
- **WHEN** an audience support request is created
- **THEN** the system persists an in-app notification for the requesting user with a link to the support request detail

#### Scenario: Refund request status changes
- **WHEN** a refund request status changes to `UNDER_REVIEW`, `APPROVED`, `REJECTED`, or `CANCELLED`
- **THEN** the system persists an in-app notification for the requesting user and may enqueue email delivery for configured milestone statuses

#### Scenario: Notification creation fails
- **WHEN** notification persistence or enqueueing fails during support or refund processing
- **THEN** the support or refund state change remains committed and the failure is reported for retry or investigation

### Requirement: Ticket resend delivery
The system SHALL support user-requested ticket resend delivery without issuing duplicate tickets or persisting raw QR material.

#### Scenario: Resend delivery loads issued tickets
- **WHEN** a ticket resend notification is delivered
- **THEN** the worker loads existing issued tickets for the owned order or ticket and recreates QR images transiently for the email

#### Scenario: Resend does not duplicate fulfillment
- **WHEN** a user requests ticket resend for an order that already received purchase confirmation
- **THEN** the system does not issue tickets again and does not mutate order payment state

#### Scenario: Repeated resend is controlled
- **WHEN** the same user repeatedly requests resend within the configured cooldown or dedupe window
- **THEN** the system returns the existing resend status or a controlled cooldown error without creating unbounded email jobs

### Requirement: Notification inbox metadata
The system SHALL persist notification metadata needed by the audience notification center while preserving existing delivery behavior.

#### Scenario: In-app notification has action metadata
- **WHEN** the system creates an in-app support, refund, order, payment, reminder, or ticket notification
- **THEN** the notification can include type, subject, body, action URL, resource type, resource ID, and read state

#### Scenario: Existing delivery jobs remain compatible
- **WHEN** existing purchase confirmation or concert reminder delivery jobs run
- **THEN** queue names, job names, retry behavior, and email delivery behavior remain compatible with the current notification delivery flow

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

