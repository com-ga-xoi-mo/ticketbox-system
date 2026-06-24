## ADDED Requirements

### Requirement: Mode-aware sync control visibility

The mobile sync status UI SHALL present the manual sync and queue-maintenance controls
(manual sync trigger, clear synced events, clear terminal results) only when they are
actionable — that is, when the device is offline or there are pending or failed offline
events — and SHALL hide them while the device is online with an empty queue. Hiding the
controls SHALL NOT remove the underlying capability; the same actions remain available
whenever the conditions to show them are met.

#### Scenario: Sync controls are hidden when online with an empty queue

- **WHEN** the device is online and there are no pending or failed offline events
- **THEN** the sync status UI SHALL hide the manual sync, clear-synced, and
  clear-terminal controls

#### Scenario: Sync controls appear when offline

- **WHEN** the device is offline
- **THEN** the sync status UI SHALL show the manual sync and queue-maintenance controls

#### Scenario: Sync controls appear when there is queued or failed work

- **WHEN** there are pending offline events awaiting sync or failed events with reasons,
  regardless of connectivity
- **THEN** the sync status UI SHALL show the relevant controls so the staff member can
  trigger sync or clear results

#### Scenario: Hidden controls preserve the sync capability

- **WHEN** the controls are hidden because the device is online with an empty queue
- **THEN** automatic sync on connectivity change and on the existing schedule SHALL
  continue unaffected, and the controls SHALL reappear when they become actionable
