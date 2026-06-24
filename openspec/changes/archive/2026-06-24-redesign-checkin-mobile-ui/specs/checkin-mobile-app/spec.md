## ADDED Requirements

### Requirement: Prominent scan result banner

The mobile scan UI SHALL present a resolved scan outcome as a prominent, visually
distinct banner that is legible at arm's length, encodes the outcome category, and is
dismissed only by the staff member choosing to scan another ticket. The banner SHALL NOT
auto-advance the workflow.

#### Scenario: Resolved scan is shown as a prominent banner

- **WHEN** an online or offline scan resolves to a business result (`accepted`,
  `duplicate`, `invalid`, `unassigned`, or `queued`)
- **THEN** the app SHALL display the result as a prominent banner whose visual treatment
  distinguishes the outcome category, in addition to the human-readable message

#### Scenario: Banner persists until staff scans again

- **WHEN** the result banner is displayed
- **THEN** the app SHALL keep showing it and SHALL NOT decode or submit a new scan until
  the staff member triggers the manual "scan another ticket" reset action

#### Scenario: Camera stays locked while the banner is shown

- **WHEN** a result banner is displayed after a scan
- **THEN** the app SHALL keep camera barcode handling suspended (consistent with the
  in-flight duplicate-decode protection) until the staff member resets to scan again
