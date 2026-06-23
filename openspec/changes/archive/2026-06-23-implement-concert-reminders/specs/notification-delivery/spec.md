## MODIFIED Requirements

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
