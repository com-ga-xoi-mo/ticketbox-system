# virtual-waiting-room Specification

## Purpose

Define the per-concert virtual waiting room that shapes high-demand checkout traffic through a Redis-backed queue, bounded admission, short-lived admission tokens, and live queue updates.

## Requirements

### Requirement: Per-concert waiting room configuration
The system SHALL allow an authorized organizer or admin to configure a virtual waiting room per concert, including whether it is enabled, whether it auto-activates by load, a manual override, the maximum checkout concurrency, the admission-token TTL, load activate/deactivate thresholds, and cooldown seconds. A waiting room SHALL default to disabled.

#### Scenario: Organizer configures a waiting room
- **WHEN** an authorized organizer or admin sets waiting-room configuration for a concert with a maximum concurrency, admission TTL, and load thresholds
- **THEN** the system SHALL persist the per-concert configuration
- **AND** a concert without configuration SHALL be treated as having its waiting room disabled

#### Scenario: Disabled config is a master off switch
- **WHEN** a waiting-room configuration has `enabled` set to false
- **THEN** the concert's waiting room SHALL be inactive regardless of manual override or measured load

#### Scenario: Invalid configuration is rejected
- **WHEN** a configuration sets a non-positive maximum concurrency or admission TTL, or a deactivate threshold that is not below the activate threshold
- **THEN** the system SHALL reject the configuration

### Requirement: Waiting room activation is effective from override or load
The system SHALL determine whether a concert's waiting room is active from the enabled flag, manual override, and measured load. If `enabled` is false the room SHALL be inactive. If enabled, `FORCE_OFF` SHALL make it inactive, `FORCE_ON` SHALL make it active, and otherwise it SHALL be active only when auto-activation is enabled and measured checkout load has crossed the activate threshold, remaining active until load stays below the deactivate threshold through a cooldown.

#### Scenario: Force-on override activates the room
- **WHEN** an organizer or admin sets the manual override to `FORCE_ON`
- **THEN** the concert's waiting room SHALL be active regardless of measured load

#### Scenario: Force-off override deactivates the room
- **WHEN** an organizer or admin sets the manual override to `FORCE_OFF`
- **THEN** the concert's waiting room SHALL be inactive regardless of measured load

#### Scenario: Auto-activation by load with hysteresis
- **WHEN** auto-activation is enabled and checkout load for the concert crosses the activate threshold
- **THEN** the waiting room SHALL become active
- **AND** it SHALL remain active until load stays below the deactivate threshold for the configured cooldown

#### Scenario: Cooldown prevents activation flapping
- **WHEN** a load-active waiting room briefly drops below the deactivate threshold and then rises again before the cooldown completes
- **THEN** the waiting room SHALL remain active

### Requirement: Audience user can join and observe the waiting queue
The system SHALL let an authenticated AUDIENCE user join a concert's waiting queue when the room is active and SHALL expose the user's current status and FIFO position. Position SHALL be ordered by join time.

#### Scenario: User joins the queue
- **WHEN** an authenticated AUDIENCE user joins the waiting queue for a concert whose room is active
- **THEN** the system SHALL place the user in the queue ordered by join time and SHALL return the user's position

#### Scenario: Position reflects FIFO order
- **WHEN** multiple users are waiting
- **THEN** each user's reported position SHALL reflect the number of users who joined ahead of them

#### Scenario: Joining an inactive room is a no-op
- **WHEN** a user requests to join the queue for a concert whose room is inactive
- **THEN** the system SHALL indicate the room is inactive and SHALL NOT require queueing to check out

#### Scenario: User leaves the queue
- **WHEN** a waiting user leaves the queue
- **THEN** the system SHALL remove the user from the queue and SHALL free their place

### Requirement: Bounded admission issues short-lived admission tokens
The system SHALL admit waiting users so that at most the configured maximum concurrency are admitted at once. When an admitted user's admission token expires, the user's pending order is finalized (paid, cancelled, or expired), or the user explicitly leaves, the freed slot SHALL be given to the next waiting user, who SHALL receive a short-lived admission token bound to that user and concert. When an admitted user creates a pending order, the system SHALL consume their admission token (preventing reuse) but SHALL NOT release their concurrency slot, extending their expiry in the active concurrency pool to match the order's reservation TTL.

#### Scenario: Admission respects the concurrency cap
- **WHEN** the number of currently admitted users is below the maximum concurrency and the queue is non-empty
- **THEN** the system SHALL admit the earliest waiting users up to the maximum concurrency and SHALL issue each an admission token

#### Scenario: Expired admission frees a slot
- **WHEN** an admitted user's admission token expires
- **THEN** the system SHALL reclaim that slot and SHALL admit the next waiting user

#### Scenario: Admission token is bound to the user and concert
- **WHEN** the system issues an admission token
- **THEN** the token SHALL be bound to the admitted user and concert and SHALL carry a bounded expiry

#### Scenario: Admission token can be looked up for the admitted user
- **WHEN** a user is admitted
- **THEN** the system SHALL expose the user's admitted status and admission token through the user's waiting-room status or stream without exposing other users' tokens

#### Scenario: Admission is idempotent under concurrent runs
- **WHEN** the admit routine runs concurrently for the same concert
- **THEN** the system SHALL NOT admit more users than the maximum concurrency and SHALL NOT issue duplicate tokens for one slot

#### Scenario: Admission token is consumed but slot is held during checkout
- **WHEN** an admitted user creates a pending order (checkout starts)
- **THEN** the system SHALL consume their admission token to prevent duplicate checkouts
- **AND** the system SHALL extend their expiry in the concurrency pool to match the order's TTL
- **AND** the user SHALL continue to be counted towards the maximum concurrency limit

#### Scenario: Finalized order frees an admission slot
- **WHEN** a user's pending order is paid, cancelled, or expires
- **THEN** the system SHALL release their waiting room slot and SHALL admit the next waiting user

### Requirement: Live queue position is streamed over SSE
The system SHALL stream a waiting user's current position and status over Server-Sent Events, authenticated by a short-lived stream token minted for the authenticated user and concert. The API instance serving the SSE connection SHALL compute position/status from Redis on its stream tick; the worker SHALL NOT push directly into an API instance's in-memory stream registry.

#### Scenario: User mints a stream token and subscribes
- **WHEN** an authenticated AUDIENCE user requests a waiting-room stream token and then opens the SSE stream with that token
- **THEN** the system SHALL authenticate the stream by the token and SHALL push the user's current position and status

#### Scenario: Stream token is scoped to the concert
- **WHEN** a stream token was minted for one concert
- **THEN** the token SHALL NOT authenticate a waiting-room stream for a different concert

#### Scenario: Stream reports admission
- **WHEN** a subscribed user is admitted
- **THEN** the stream SHALL push an admitted status and the user's admission token so the client can proceed to checkout

#### Scenario: Invalid stream token is rejected
- **WHEN** an SSE connection is opened without a valid stream token
- **THEN** the system SHALL reject the connection

### Requirement: Waiting room runtime state is ephemeral in Redis
The system SHALL keep the waiting queue, the admitted set, admission tokens, and the load counter in Redis only, with no PostgreSQL persistence of this runtime state. Loss of Redis runtime state SHALL NOT corrupt orders or inventory.

#### Scenario: Runtime state is not persisted to PostgreSQL
- **WHEN** the waiting room queues, admits, and issues tokens
- **THEN** the queue, admitted set, tokens, and load counter SHALL live in Redis and SHALL NOT be written to PostgreSQL

#### Scenario: Redis state loss does not affect orders
- **WHEN** Redis runtime state for a waiting room is lost
- **THEN** existing orders and ticket inventory SHALL be unaffected and the queue SHALL simply re-form

### Requirement: Waiting room admit loop runs in worker scope
The system SHALL run the periodic admission loop in the backend worker application and SHALL NOT run the admit-loop processor in the API application.

#### Scenario: Admit loop runs in the worker
- **WHEN** the backend worker application starts
- **THEN** the waiting-room admit-loop processor SHALL resolve its queue provider from its own worker module scope
- **AND** the API application SHALL NOT start the admit-loop processor

#### Scenario: Worker discovers runnable waiting rooms from config
- **WHEN** the admit-loop worker ticks
- **THEN** it SHALL load runnable waiting-room configs from PostgreSQL rather than scanning arbitrary Redis keys
- **AND** it SHALL run admission only for rooms whose effective active state is active

### Requirement: Waiting room is distinct from waitlist and lottery
The virtual waiting room SHALL only control entry into checkout and SHALL NOT grant any purchase entitlement, join a waitlist, or run a lottery draw.

#### Scenario: Admission does not grant a purchase entitlement
- **WHEN** a user is admitted through the waiting room
- **THEN** the system SHALL NOT create a waitlist entry, a lottery registration, or a purchase entitlement for that user
